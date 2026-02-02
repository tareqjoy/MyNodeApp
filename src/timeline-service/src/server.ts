
import {
  getApiPath,
  authorize,
  commonServiceMetricsMiddleware,
  getFileLogger,
  getAccessLogger,
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import bodyParser from "body-parser";
import { createHomeRouter } from "./routes/home";
import { connectRedis } from "@tareqjoy/clients";
import { ServerProbStatus } from "@tareqjoy/models";


const logger = getFileLogger(__filename);

const appport = process.env.PORT || 5001;
const api_path_root = process.env.API_PATH_ROOT || "/v1/timeline";

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
  app.use(bodyParser.json());
  app.use(commonServiceMetricsMiddleware(api_path_root));
  app.use(getAccessLogger());

  app.get("/health", (_req, res) => {
    res.status(200).json(ServerProbStatus.OK);
  });

  app.get("/ready", (_req, res) => {
    if (!isReady) {
      return res.status(503).json(ServerProbStatus.NOT_READY);
    }
    return res.status(200).json(ServerProbStatus.READY);
  });

  const redisClient = await connectRedis();

  app.use(
    getApiPath(api_path_root, "home"),
    authorize,
    createHomeRouter(redisClient),
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
        message: req.url,
      });
    },
  );

  isReady = true;

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      await redisClient.quit();
      logger.info(`Redis disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
