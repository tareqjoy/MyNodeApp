import { RedisClientType } from "redis";
import { getFileLogger } from "@tareqjoy/utils";
import { workerOperationCount } from "../metrics/metrics";

const logger = getFileLogger(__filename);

export type TopKUpdaterConfig = {
  enabled: boolean;
  tickIntervalMs: number;
  batchSize: number;
  headRefreshIntervalMs: number;
  headRefreshSize: number;
  topKMaxSize: number;
  windowSeconds: number;
  bucketSizeSeconds: number;
  metric: string;
  segment: string;
  bucketSuffix: string;
  changedSetKey: string;
  topKKey: string;
};

export type TopKUpdaterHandle = {
  stop: () => Promise<void>;
};

export function startTopKUpdater(
  redisClient: RedisClientType<any, any, any, any>,
  config: TopKUpdaterConfig,
): TopKUpdaterHandle {
  if (!config.enabled) {
    logger.info("TopK updater disabled by config");
    return { stop: async () => {} };
  }

  let stopped = false;
  let loopPromise: Promise<void> | undefined;
  let lastHeadRefresh = 0;

  const loop = async () => {
    while (!stopped) {
      const tickStart = Date.now();
      try {
        const didRefresh = await runTick(redisClient, config, lastHeadRefresh);
        if (didRefresh) {
          lastHeadRefresh = Date.now();
        }
      } catch (error) {
        logger.error("TopK updater tick failed", error);
      }

      const elapsed = Date.now() - tickStart;
      const sleepMs = Math.max(0, config.tickIntervalMs - elapsed);
      if (sleepMs > 0) {
        await delay(sleepMs);
      }
    }
  };

  loopPromise = loop();

  return {
    stop: async () => {
      stopped = true;
      if (loopPromise) {
        await loopPromise;
      }
    },
  };
}

async function runTick(
  redisClient: RedisClientType<any, any, any, any>,
  config: TopKUpdaterConfig,
  lastHeadRefresh: number,
): Promise<boolean> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const rawCutoff = Math.max(0, nowSeconds - config.windowSeconds);
  const cutoffAligned =
    Math.floor(rawCutoff / config.bucketSizeSeconds) *
    config.bucketSizeSeconds;
  let didRefresh = false;

  const ids = await scanChangedIds(redisClient, config.changedSetKey, config.batchSize);
  if (ids.length > 0) {
    const scores = await computeScores(
      redisClient,
      config,
      ids,
      cutoffAligned,
    );

    if (scores.length > 0) {
      const updated = await applyScores(redisClient, config.topKKey, scores);
      if (updated) {
        await redisClient.sRem(config.changedSetKey, ids as string[]);
        await trimTopK(redisClient, config.topKKey, config.topKMaxSize);
        workerOperationCount.labels("topk_updater", "processed_ids").inc(ids.length);
      }
    }
  }

  if (
    config.headRefreshSize > 0 &&
    Date.now() - lastHeadRefresh >= config.headRefreshIntervalMs
  ) {
    didRefresh = true;
    const headIds = (await redisClient.zRange(
      config.topKKey,
      0,
      config.headRefreshSize - 1,
      { REV: true },
    )) as string[];
    if (headIds.length > 0) {
      const headScores = await computeScores(
        redisClient,
        config,
        headIds,
        cutoffAligned,
      );
      if (headScores.length > 0) {
        const updated = await applyScores(redisClient, config.topKKey, headScores);
        if (updated) {
          workerOperationCount
            .labels("topk_updater", "head_refresh")
            .inc(headIds.length);
        }
      }
    }
  }
  return didRefresh;
}

async function scanChangedIds(
  redisClient: RedisClientType<any, any, any, any>,
  key: string,
  batchSize: number,
): Promise<string[]> {
  let cursor = "0";
  const ids: string[] = [];

  while (ids.length < batchSize) {
    const reply: any = await redisClient.sScan(key, cursor, {
      COUNT: Math.min(batchSize - ids.length, batchSize),
    });

    const { nextCursor, members } = normalizeScanReply(reply);
    cursor = nextCursor;
    ids.push(...members);

    if (cursor === "0") {
      break;
    }
  }

  return ids;
}

async function computeScores(
  redisClient: RedisClientType<any, any, any, any>,
  config: TopKUpdaterConfig,
  ids: string[],
  cutoffAligned: number,
): Promise<Array<{ id: string; score: number }>> {
  const pipeline = redisClient.multi();
  for (const id of ids) {
    const bucketKey = buildBucketKey(config, id);
    pipeline.zRangeByScoreWithScores(bucketKey, cutoffAligned, "+inf");
  }

  const replies = await pipeline.exec();
  if (!replies) {
    logger.warn("TopK updater read pipeline returned null");
    return [];
  }

  if (hasPipelineError(replies)) {
    logger.warn("TopK updater read pipeline had errors");
    return [];
  }

  return replies.map((reply: any, index: number) => ({
    id: ids[index],
    score: sumScores(reply),
  }));
}

async function applyScores(
  redisClient: RedisClientType<any, any, any, any>,
  topKKey: string,
  scores: Array<{ id: string; score: number }>,
): Promise<boolean> {
  const pipeline = redisClient.multi();
  for (const entry of scores) {
    if (entry.score > 0) {
      pipeline.zAdd(topKKey, { score: entry.score, value: entry.id });
    } else {
      pipeline.zRem(topKKey, entry.id);
    }
  }

  const replies = await pipeline.exec();
  if (!replies) {
    logger.warn("TopK updater write pipeline returned null");
    return false;
  }
  if (hasPipelineError(replies)) {
    logger.warn("TopK updater write pipeline had errors");
    return false;
  }
  return true;
}

async function trimTopK(
  redisClient: RedisClientType<any, any, any, any>,
  topKKey: string,
  maxSize: number,
): Promise<void> {
  const size = await redisClient.zCard(topKKey);
  if (size > maxSize) {
    const removeEnd = size - maxSize - 1;
    if (removeEnd >= 0) {
      await redisClient.zRemRangeByRank(topKKey, 0, removeEnd);
    }
  }
}

function buildBucketKey(config: TopKUpdaterConfig, postId: string): string {
  return `b:${config.metric}:${config.segment}:${postId}:${config.bucketSuffix}`;
}

function normalizeScanReply(reply: any): { nextCursor: string; members: string[] } {
  if (Array.isArray(reply)) {
    const [nextCursor, members] = reply as [string, string[]];
    return { nextCursor: String(nextCursor), members: members ?? [] };
  }
  return {
    nextCursor: String(reply?.cursor ?? "0"),
    members: reply?.members ?? [],
  };
}

function sumScores(reply: any): number {
  if (!reply || reply.length === 0) {
    return 0;
  }

  if (typeof reply[0] === "string") {
    let sum = 0;
    for (let i = 1; i < reply.length; i += 2) {
      sum += Number(reply[i]) || 0;
    }
    return sum;
  }

  if (typeof reply[0] === "object" && reply[0] !== null && "score" in reply[0]) {
    return reply.reduce((acc: number, item: any) => acc + (Number(item.score) || 0), 0);
  }

  return 0;
}

function hasPipelineError(replies: any[]): boolean {
  return replies.some((reply) => reply instanceof Error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
