import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";

import { connectKafkaConsumer, connectRedis } from "@tareqjoy/clients";
import { createFanoutRouter } from "./routes/fanout";
import { newPostFanout } from "./workers/new-post-worker";
import { iFollowedFanout } from "./workers/i-followed-worker";
import { iUnfollowedFanout } from "./workers/i-unfollowed-worker";
import { commonServiceMetricsMiddleware, getExpressLogger, getFileLogger } from "@tareqjoy/utils";
import { workerDurationHistogram, workerStatCount } from "./metrics/metrics";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || "fanout";
const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "new-post";
const kafka_i_followed_fanout_topic =
  process.env.KAFKA_I_FOLLOWED_FANOUT_TOPIC || "i-followed";
const kafka_i_unfollowed_fanout_topic =
  process.env.KAFKA_I_UNFOLLOWED_FANOUT_TOPIC || "i-unfollowed";
const kafka_fanout_group = process.env.KAFKA_FANOUT_GROUP || "fanout-group";

const logger =  getFileLogger(__filename);

const appport = process.env.PORT || 5004;
const api_path_root = process.env.API_PATH_ROOT || "/v1/fanout";

const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(commonServiceMetricsMiddleware(api_path_root));
  app.use(getExpressLogger());

  const newPostConsumer = await connectKafkaConsumer(
    kafka_client_id,
    kafka_fanout_group,
    [
      kafka_new_post_fanout_topic,
      kafka_i_followed_fanout_topic,
      kafka_i_unfollowed_fanout_topic,
    ],
  );
  const redisClient = await connectRedis();
  await newPostConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      logger.silly("Kafka message received: ", {
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
          }

          if (isProcessed) {
            logger.silly(
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

          logger.silly(`took ${durationInS}s to process the message`);
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

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      await newPostConsumer.disconnect();
      logger.info(`Consumer disconnected`);

      if (redisClient.isOpen) {
        await redisClient.quit();
        logger.info(`Redis disconnected`);
      } else {
        logger.info(`Redis was not connected at the first place`);
      }
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
