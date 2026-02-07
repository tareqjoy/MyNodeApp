import {
  commonServiceMetricsMiddleware,
  getAccessLogger,
  getFileLogger,
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";

import { connectKafkaConsumer, connectKafkaProducer, connectMongo, connectRedis } from "@tareqjoy/clients";
import { createFanoutRouter } from "./routes/fanout";
import { newPostFanout } from "./workers/post-fanout-worker";
import { iFollowedFanout } from "./workers/i-followed-worker";
import { iUnfollowedFanout } from "./workers/i-unfollowed-worker";
import { workerDurationHistogram, workerStatCount } from "./metrics/metrics";
import { postLikeWorker } from "./workers/post-like-worker";
import { postProcessWorker } from "./workers/post-process-worker";
import {
  startTopKUpdater,
  type TopKUpdaterHandle,
  type TopKUpdaterConfig,
} from "./workers/topk-updater-worker";
import { ServerProbStatus } from "@tareqjoy/models";
import { Consumer, Producer } from "kafkajs";
import { type RedisClientType } from "redis";
import { Mongoose } from "mongoose";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || "fanout";
const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "post-fanout";
const kafka_post_topic =
    process.env.KAFKA_NEW_POST_TOPIC || "new-post";
const kafka_i_followed_fanout_topic =
  process.env.KAFKA_I_FOLLOWED_FANOUT_TOPIC || "i-followed";
const kafka_i_unfollowed_fanout_topic =
  process.env.KAFKA_I_UNFOLLOWED_FANOUT_TOPIC || "i-unfollowed";
const kafka_post_like_fanout_topic =
  process.env.KAFKA_NEW_POST_LIKE_TOPIC || "post-like";
const kafka_fanout_group = process.env.KAFKA_FANOUT_GROUP || "fanout-group";

const topk_1h_enabled =
  (process.env.TOPK_1H_ENABLED ||
    process.env.TOPK_UPDATER_ENABLED ||
    "true") === "true";
const topk_24h_enabled = (process.env.TOPK_24H_ENABLED || "true") === "true";
const topk_30d_enabled = (process.env.TOPK_30D_ENABLED || "true") === "true";


const logger =  getFileLogger(__filename);

const appport = process.env.PORT || 5004;
const api_path_root = process.env.API_PATH_ROOT || "/v1/fanout";

const app = express();
let isReady = false;
let topkUpdaters: TopKUpdaterHandle[] = [];

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(commonServiceMetricsMiddleware(api_path_root));
  app.use(getAccessLogger());

  app.get("/health", (_req, res) => {
    res.status(200).json(ServerProbStatus.OK);
  });

  app.get("/ready", (_req, res) => {
    if (!isReady) {
      res.status(503).json(ServerProbStatus.NOT_READY);
    }
    res.status(200).json(ServerProbStatus.READY);
  });

  const kafkaProducer = await connectKafkaProducer(kafka_client_id);
  
  const newPostConsumer = await connectKafkaConsumer(
    kafka_client_id,
    kafka_fanout_group,
    [
      kafka_post_topic,
      kafka_new_post_fanout_topic,
      kafka_i_followed_fanout_topic,
      kafka_i_unfollowed_fanout_topic,
      kafka_post_like_fanout_topic
    ],
  );
  const redisClient = await connectRedis();
  const mongoClient = await connectMongo();

  await listenKafkaEvents(newPostConsumer, kafkaProducer, redisClient, mongoClient);

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(api_path_root, createFanoutRouter(redisClient));

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const error = new HttpError("Not found", 404);
      next(error);
    },
  );

  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.status(error.statusCode || 500);
      res.json({
        message: error,
      });
    },
  );

  isReady = true;

  const topkConfigs: TopKUpdaterConfig[] = [
    {
      enabled: topk_1h_enabled,
      tickIntervalMs: Number(process.env.TOPK_1H_TICK_INTERVAL_MS || 2000),
      batchSize: Number(process.env.TOPK_1H_BATCH_SIZE || 2000),
      headRefreshIntervalMs: Number(
        process.env.TOPK_1H_HEAD_REFRESH_INTERVAL_MS || 60000,
      ),
      headRefreshSize: Number(process.env.TOPK_1H_HEAD_REFRESH_SIZE || 1000),
      topKMaxSize: Number(process.env.TOPK_1H_MAX_SIZE || 5000),
      windowSeconds: Number(process.env.TOPK_1H_WINDOW_SECONDS || 3600),
      bucketSizeSeconds: Number(process.env.TOPK_1H_BUCKET_SIZE_SECONDS || 60),
      metric: process.env.TOPK_1H_METRIC || "likes",
      segment: process.env.TOPK_1H_SEGMENT || "global",
      bucketSuffix: process.env.TOPK_1H_BUCKET_SUFFIX || "m",
      changedSetKey: process.env.TOPK_1H_CHANGED_SET_KEY || "chg:likes:global:1h",
      topKKey: process.env.TOPK_1H_KEY || "topk:likes:global:1h",
    },
    {
      enabled: topk_24h_enabled,
      tickIntervalMs: Number(process.env.TOPK_24H_TICK_INTERVAL_MS || 30000),
      batchSize: Number(process.env.TOPK_24H_BATCH_SIZE || 2000),
      headRefreshIntervalMs: Number(
        process.env.TOPK_24H_HEAD_REFRESH_INTERVAL_MS || 300000,
      ),
      headRefreshSize: Number(process.env.TOPK_24H_HEAD_REFRESH_SIZE || 1000),
      topKMaxSize: Number(process.env.TOPK_24H_MAX_SIZE || 5000),
      windowSeconds: Number(process.env.TOPK_24H_WINDOW_SECONDS || 86400),
      bucketSizeSeconds: Number(process.env.TOPK_24H_BUCKET_SIZE_SECONDS || 3600),
      metric: process.env.TOPK_24H_METRIC || "likes",
      segment: process.env.TOPK_24H_SEGMENT || "global",
      bucketSuffix: process.env.TOPK_24H_BUCKET_SUFFIX || "h",
      changedSetKey: process.env.TOPK_24H_CHANGED_SET_KEY || "chg:likes:global:24h",
      topKKey: process.env.TOPK_24H_KEY || "topk:likes:global:24h",
    },
    {
      enabled: topk_30d_enabled,
      tickIntervalMs: Number(process.env.TOPK_30D_TICK_INTERVAL_MS || 300000),
      batchSize: Number(process.env.TOPK_30D_BATCH_SIZE || 2000),
      headRefreshIntervalMs: Number(
        process.env.TOPK_30D_HEAD_REFRESH_INTERVAL_MS || 900000,
      ),
      headRefreshSize: Number(process.env.TOPK_30D_HEAD_REFRESH_SIZE || 1000),
      topKMaxSize: Number(process.env.TOPK_30D_MAX_SIZE || 5000),
      windowSeconds: Number(process.env.TOPK_30D_WINDOW_SECONDS || 30 * 86400),
      bucketSizeSeconds: Number(process.env.TOPK_30D_BUCKET_SIZE_SECONDS || 86400),
      metric: process.env.TOPK_30D_METRIC || "likes",
      segment: process.env.TOPK_30D_SEGMENT || "global",
      bucketSuffix: process.env.TOPK_30D_BUCKET_SUFFIX || "d",
      changedSetKey: process.env.TOPK_30D_CHANGED_SET_KEY || "chg:likes:global:30d",
      topKKey: process.env.TOPK_30D_KEY || "topk:likes:global:30d",
    },
  ];

  topkUpdaters = topkConfigs.map((cfg) => startTopKUpdater(redisClient, cfg));

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      await newPostConsumer.disconnect();
      logger.info(`Consumer disconnected`);
      await kafkaProducer.disconnect();
      logger.info(`Producer disconnected`);
      if (topkUpdaters.length > 0) {
        await Promise.all(topkUpdaters.map((updater) => updater.stop()));
        logger.info(`TopK updaters stopped`);
      }
      if (redisClient.isOpen) {
        await redisClient.quit();
        logger.info(`Redis disconnected`);
      } else {
        logger.info(`Redis was not connected at the first place`);
      }
      await mongoClient.disconnect();
      logger.info(`MongoDB disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

async function listenKafkaEvents(
  newPostConsumer: Consumer,
  kafkaProducer: Producer,
  redisClient: RedisClientType<any, any, any, any>,
  mongoClient: Mongoose,
) {
  await newPostConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      logger.debug("Kafka message received: ", {
        topic,
        partition,
        offset: message.offset,
        value: message.value?.toString(),
      });
      var isProcessed = false;
      if (message.value != undefined) {
        const timerEndFn = workerDurationHistogram.labels(topic).startTimer();
        try {
          if (topic === kafka_new_post_fanout_topic) {
            isProcessed = await newPostFanout(
              redisClient,
              message.value?.toString(),
            );
          } else if (topic === kafka_i_followed_fanout_topic) {
            isProcessed = await iFollowedFanout(
              redisClient,
              message.value?.toString(),
            );
          } else if (topic === kafka_i_unfollowed_fanout_topic) {
            isProcessed = await iUnfollowedFanout(
              redisClient,
              message.value?.toString(),
            );
          } else if (topic === kafka_post_like_fanout_topic) {
            isProcessed = await postLikeWorker(
              redisClient,
              mongoClient,
              message.value.toString(),
            );
          } else if (topic === kafka_post_topic) {
            isProcessed = await postProcessWorker(
              message.value?.toString(),
              mongoClient,
              kafkaProducer,
            );
          }

          if (isProcessed) {
            logger.debug(
              `Message is processed by worker. topic: ${topic}. Committing offset`,
            );
            await newPostConsumer.commitOffsets([
              {
                topic,
                partition,
                offset: (Number(message.offset) + 1).toString(),
              },
            ]);
          } else {
            logger.warn(`Message is not processed by worker. topic: ${topic}`);
          }
          const durationInS = timerEndFn();

          logger.debug(`took ${durationInS}s to process the message`);
        } catch (error) {
          logger.error("error while executing task", error);
        }
      } else {
        logger.warn(`Message value undefined`);
      }
      workerStatCount
        .labels(topic, isProcessed ? "successful" : "unsuccessful")
        .inc();
    },
    autoCommit: false,
  });
}

main();
