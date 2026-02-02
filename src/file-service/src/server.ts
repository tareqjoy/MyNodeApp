import {
  getApiPath,
  authorize,
  commonServiceMetricsMiddleware,
  getFileLogger,
  getInternalApiPath,
  getAccessLogger,
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";
import { createProfilePhotoRouter } from "./routes/profile-photo";
import { connectMongo } from "@tareqjoy/clients";
import { createGetAttachmentRouter, createInternalGetAttachmentRouter } from "./routes/get-attachment";
import { Server } from "http";
import { ServerProbStatus } from "@tareqjoy/models";

const logger = getFileLogger(__filename);

const appport = process.env.PORT || 5008;
const api_path_root = process.env.API_PATH_ROOT || "/v1/file";


export const app = express();
let isReady = false;

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  const mongoClient = await connectMongo();
  app.use(bodyParser.json());
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

  //Only for internal use, should be protected from public access
  app.use(
    getInternalApiPath(api_path_root, "attachment-info"),
    createInternalGetAttachmentRouter(mongoClient)
  );

  //For public use
  app.use(
    getApiPath(api_path_root, "profile-photo"),
    authorize,
    createProfilePhotoRouter(mongoClient)
  );

  app.use(
    getApiPath(api_path_root, "attachment"),
    authorize,
    createGetAttachmentRouter(mongoClient)
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

  isReady = true;

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      await mongoClient.disconnect();
      logger.info(`MongoDB disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
