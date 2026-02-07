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

const topk_updater_enabled = (process.env.TOPK_UPDATER_ENABLED || "true") === "true";
const topk_tick_interval_ms = Number(process.env.TOPK_TICK_INTERVAL_MS || 2000);
const topk_batch_size = Number(process.env.TOPK_BATCH_SIZE || 2000);
const topk_head_refresh_interval_ms = Number(
  process.env.TOPK_HEAD_REFRESH_INTERVAL_MS || 60000,
);
const topk_head_refresh_size = Number(process.env.TOPK_HEAD_REFRESH_SIZE || 1000);
const topk_max_size = Number(process.env.TOPK_MAX_SIZE || 5000);
const topk_window_seconds = Number(process.env.TOPK_WINDOW_SECONDS || 3600);
const topk_bucket_size_seconds = Number(
  process.env.TOPK_BUCKET_SIZE_SECONDS || 60,
);
const topk_metric = process.env.TOPK_METRIC || "likes";
const topk_segment = process.env.TOPK_SEGMENT || "global";
const topk_bucket_suffix = process.env.TOPK_BUCKET_SUFFIX || "m";
const topk_changed_set_key =
  process.env.TOPK_CHANGED_SET_KEY || "chg:likes:global:1h";
const topk_key = process.env.TOPK_KEY || "topk:likes:global:1h";


const logger =  getFileLogger(__filename);

const appport = process.env.PORT || 5004;
const api_path_root = process.env.API_PATH_ROOT || "/v1/fanout";

const app = express();
let isReady = false;
let topkUpdater: TopKUpdaterHandle | undefined;

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

  topkUpdater = startTopKUpdater(redisClient, {
    enabled: topk_updater_enabled,
    tickIntervalMs: topk_tick_interval_ms,
    batchSize: topk_batch_size,
    headRefreshIntervalMs: topk_head_refresh_interval_ms,
    headRefreshSize: topk_head_refresh_size,
    topKMaxSize: topk_max_size,
    windowSeconds: topk_window_seconds,
    bucketSizeSeconds: topk_bucket_size_seconds,
    metric: topk_metric,
    segment: topk_segment,
    bucketSuffix: topk_bucket_suffix,
    changedSetKey: topk_changed_set_key,
    topKKey: topk_key,
  });

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
      if (topkUpdater) {
        await topkUpdater.stop();
        logger.info(`TopK updater stopped`);
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
