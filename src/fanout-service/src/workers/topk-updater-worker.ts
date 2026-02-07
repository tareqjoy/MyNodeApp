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

  logger.info("TopK updater starting", {
    tickIntervalMs: config.tickIntervalMs,
    batchSize: config.batchSize,
    headRefreshIntervalMs: config.headRefreshIntervalMs,
    headRefreshSize: config.headRefreshSize,
    topKMaxSize: config.topKMaxSize,
    windowSeconds: config.windowSeconds,
    bucketSizeSeconds: config.bucketSizeSeconds,
    metric: config.metric,
    segment: config.segment,
    bucketSuffix: config.bucketSuffix,
    changedSetKey: config.changedSetKey,
    topKKey: config.topKKey,
  });

  let stopped = false;
  let loopPromise: Promise<void> | undefined;
  let lastHeadRefresh = 0;
  let sleepTimer: NodeJS.Timeout | null = null;
  let sleepResolve: (() => void) | null = null;

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
        await new Promise<void>((resolve) => {
          sleepResolve = resolve;
          sleepTimer = setTimeout(() => {
            sleepTimer = null;
            sleepResolve = null;
            resolve();
          }, sleepMs);
        });
      }
    }
  };

  loopPromise = loop();

  return {
    stop: async () => {
      stopped = true;
      if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
      }
      if (sleepResolve) {
        sleepResolve();
        sleepResolve = null;
      }
      if (loopPromise) {
        const timeoutMs = 5000;
        await Promise.race([
          loopPromise,
          new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
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
  const endAligned =
    Math.floor(nowSeconds / config.bucketSizeSeconds) *
    config.bucketSizeSeconds;
  let didRefresh = false;

  let changedSetSize: number | undefined;
  try {
    changedSetSize = await redisClient.sCard(config.changedSetKey);
  } catch (error) {
    logger.warn("TopK updater failed to read changed set size", error);
  }

  const ids = await scanChangedIds(redisClient, config.changedSetKey, config.batchSize);
  logger.debug("TopK updater tick", {
    changedSetKey: config.changedSetKey,
    changedSetSize,
    scannedIds: ids.length,
    cutoffAligned,
    endAligned,
  });
  if (ids.length > 0) {
    const scores = await computeScores(
      redisClient,
      config,
      ids,
      cutoffAligned,
      endAligned,
    );

    if (scores.length > 0) {
      const nonZero = scores.filter((entry) => entry.score > 0).length;
      const updated = await applyScores(redisClient, config.topKKey, scores);
      if (updated) {
        await redisClient.sRem(config.changedSetKey, ids as string[]);
        await trimTopK(redisClient, config.topKKey, config.topKMaxSize);
        workerOperationCount.labels("topk_updater", "processed_ids").inc(ids.length);
        logger.info("TopK updater applied scores", {
          topKKey: config.topKKey,
          ids: ids.length,
          nonZero,
        });
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
    logger.debug("TopK updater head refresh", {
      topKKey: config.topKKey,
      headCount: headIds.length,
    });
    if (headIds.length > 0) {
      const headScores = await computeScores(
        redisClient,
        config,
        headIds,
        cutoffAligned,
        endAligned,
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
  endAligned: number,
): Promise<Array<{ id: string; score: number }>> {
  const indexPipeline = redisClient.multi();
  for (const id of ids) {
    const indexKey = buildBucketIndexKey(config, id);
    indexPipeline.zRangeByScore(indexKey, cutoffAligned, endAligned);
  }

  const indexReplies = await indexPipeline.exec();
  if (!indexReplies) {
    logger.warn("TopK updater index pipeline returned null");
    return [];
  }

  if (hasPipelineError(indexReplies)) {
    logger.warn("TopK updater index pipeline had errors");
    return [];
  }

  const bucketLists = indexReplies.map((reply: any) =>
    Array.isArray(reply) ? (reply as string[]) : [],
  );

  const hmCommands: Array<{ id: string; buckets: string[] }> = [];
  ids.forEach((id, idx) => {
    const buckets = bucketLists[idx];
    if (buckets.length > 0) {
      hmCommands.push({ id, buckets });
    }
  });

  const hmPipeline = redisClient.multi();
  for (const cmd of hmCommands) {
    const bucketKey = buildBucketKey(config, cmd.id);
    hmPipeline.hmGet(bucketKey, cmd.buckets);
  }

  const hmReplies = await hmPipeline.exec();
  if (!hmReplies) {
    logger.warn("TopK updater HMGET pipeline returned null");
    return [];
  }
  if (hasPipelineError(hmReplies)) {
    logger.warn("TopK updater HMGET pipeline had errors");
    return [];
  }

  const scoreMap = new Map<string, number>();
  hmReplies.forEach((reply: any, idx: number) => {
    const { id } = hmCommands[idx];
    const values = Array.isArray(reply) ? (reply as Array<string | null>) : [];
    const sum = values.reduce(
      (acc, value) => acc + (value ? Number(value) || 0 : 0),
      0,
    );
    scoreMap.set(id, sum);
  });

  return ids.map((id) => ({
    id,
    score: scoreMap.get(id) ?? 0,
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

function buildBucketIndexKey(config: TopKUpdaterConfig, postId: string): string {
  return `b:${config.metric}:${config.segment}:${postId}:${config.bucketSuffix}:idx`;
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

function hasPipelineError(replies: any[]): boolean {
  return replies.some((reply) => reply instanceof Error);
}
