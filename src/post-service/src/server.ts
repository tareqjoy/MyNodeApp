import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";
import { connectKafkaProducer, connectMongo } from "@tareqjoy/clients";
import { createCreateRouter } from "./routes/create";
import {
  authorize,
  commonServiceMetricsMiddleware,
  getApiPath,
  getExpressLogger,
  getInternalApiPath,
  getLogger,
  initWinstonLogger,
} from "@tareqjoy/utils";
import { createGetRouter } from "./routes/get";
import { createGetByUserRouter } from "./routes/get-by-user";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || "post";

initWinstonLogger("auth-service");
const logger = getLogger(__filename);

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
  app.use(getExpressLogger());

  const kafkaNewPostProducer = await connectKafkaProducer(kafka_client_id);
  const mongoClient = await connectMongo();

  //Only for internal use, should be protected from public access
  app.use(
    getInternalApiPath(api_path_root, "get-by-user"),
    createGetByUserRouter(mongoClient),
  );

  //For public use
  app.use(
    getApiPath(api_path_root, "create"),
    authorize,
    createCreateRouter(mongoClient, kafkaNewPostProducer),
  );
  app.use(
    getApiPath(api_path_root, "get"),
    authorize,
    createGetRouter(mongoClient),
  );
  app.use(
    getApiPath(api_path_root, "get-by-user"),
    authorize,
    createGetByUserRouter(mongoClient),
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
      await kafkaNewPostProducer.disconnect();
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
