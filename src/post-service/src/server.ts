import {
  authorize,
  commonServiceMetricsMiddleware,
  getAccessLogger,
  getApiPath,
  getFileLogger,
  getInternalApiPath,
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";
import { connectKafkaProducer, connectMongo, connectRedis } from "@tareqjoy/clients";
import { createCreateRouter } from "./routes/create-post/create-post";
import { createGetRouter } from "./routes/get-post/get-post";
import { createGetByUserRouter } from "./routes/get-by-user/get-by-user";
import { createLikeRouter } from "./routes/like";
import { createProfilePhotoRouter } from "./routes/create-post/create-post-profile-photo";
import { createInternalGetByUserRouter } from "./routes/get-by-user/get-by-user-internal";
import { createInternalGetRouter } from "./routes/get-post/get-post-internal";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || "post";

const logger = getFileLogger(__filename);

const appport = process.env.PORT || 5005;
const api_path_root = process.env.API_PATH_ROOT || "/v1/post";

export const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(bodyParser.json());
  app.use(commonServiceMetricsMiddleware(api_path_root));
  app.use(getAccessLogger());

  const kafkaProducer = await connectKafkaProducer(kafka_client_id);
  const mongoClient = await connectMongo();
  const redisClient = await connectRedis();

  //Only for internal use, should be protected from public access
  app.use(
    getInternalApiPath(api_path_root, "get-by-user"),
    createInternalGetByUserRouter(mongoClient, redisClient),
  );
  app.use(
    getInternalApiPath(api_path_root, "get"),
    createInternalGetRouter(mongoClient, redisClient)
  );

  //For public use
  app.use(
    getApiPath(api_path_root, "create"),
    authorize,
    createCreateRouter(mongoClient, kafkaProducer),
  );
  app.use(
    getApiPath(api_path_root, "profile-photo"),
    authorize,
    createProfilePhotoRouter(mongoClient, kafkaProducer)
  );
  app.use(
    getApiPath(api_path_root, "get"),
    authorize,
    createGetRouter(mongoClient, redisClient),
  );
  app.use(
    getApiPath(api_path_root, "get-by-user"),
    authorize,
    createGetByUserRouter(mongoClient, redisClient),
  );
  app.use(
    getApiPath(api_path_root, "like"),
    authorize,
    createLikeRouter(mongoClient, redisClient, kafkaProducer),
  );

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
      await kafkaProducer.disconnect();
      logger.info(`Producer disconnected`);
      await mongoClient.disconnect();
      logger.info(`MongoDB disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
