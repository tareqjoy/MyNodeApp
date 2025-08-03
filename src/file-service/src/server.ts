import {
  getApiPath,
  authorize,
  commonServiceMetricsMiddleware,
  getFileLogger,
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";
import { createProfilePhotoRouter } from "./routes/profile-photo";
import { connectKafkaConsumer, connectKafkaProducer } from "@tareqjoy/clients";
import { workerDurationHistogram, workerStatCount } from "./metrics/metrics";
import { photoProcessWorker } from "./workers/photo-process-worker";

const logger = getFileLogger(__filename);

const appport = process.env.PORT || 5008;
const api_path_root = process.env.API_PATH_ROOT || "/v1/file";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || "file";
const kafka_photo_upload_topic =
  process.env.KAFKA_PHOTO_UPLOAD_TOPIC || "photo-upload";

const kafka_file_group = process.env.KAFKA_FILE_GROUP || "file-group";


export const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  const fileUploadConsumer = await connectKafkaConsumer(
    kafka_client_id,
    kafka_file_group,
    [kafka_photo_upload_topic]
  );

  await fileUploadConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      logger.debug("Kafka message received: ", {
        topic,
        partition,
        offset: message.offset,
        value: message.value?.toString(),
      });
      let isProcessed = false;
      if (message.value != undefined) {
        const timerEndFn = workerDurationHistogram.labels(topic).startTimer();
        try {
          if (topic === kafka_photo_upload_topic) {
            isProcessed = await photoProcessWorker(
              message.value?.toString()
            );
          } 

          if (isProcessed) {
            logger.debug(
              `Message is processed by worker. topic: ${topic}. Committing offset`
            );
            await fileUploadConsumer.commitOffsets([
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

  const kafkaProducer = await connectKafkaProducer(kafka_client_id);
  
  app.use(bodyParser.json());
  app.use(commonServiceMetricsMiddleware(api_path_root));
  // app.use(getExpressLogger());

  app.use(
    getApiPath(api_path_root, "profile-photo"),
    authorize,
    createProfilePhotoRouter(kafkaProducer)
  );

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const error = new HttpError("Not found", 404);
      next(error);
    }
  );

  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      res.status(error.statusCode || 500);
      res.json({
        message: req.url,
      });
    }
  );

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      await kafkaProducer.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
