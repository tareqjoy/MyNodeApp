import {
  authorize,
  commonServiceMetricsMiddleware,
  getAccessLogger,
  getApiPath,
  getFileLogger,
  getInternalApiPath
} from "@tareqjoy/utils";
import express from "express";
import "reflect-metadata";
import { connectMongo, connectRedis } from "@tareqjoy/clients";
import { createSignUpRouter } from "./routes/public/signup";
import { createUserDetailsRouter } from "./routes/user-details";
import { createUserIdRouter } from "./routes/public/userid";
import bodyParser from "body-parser";
import { createSignInRouter } from "./routes/public/signin";
import "source-map-support/register";
import { createCheckUsernameRouter } from "./routes/public/check-username";
import { createUserInternalRouter } from "./routes/internal/user-details";
import { ServerProbStatus } from "@tareqjoy/models";


const logger = getFileLogger(__filename);

const appport = process.env.PORT || 5002;

const api_path_root = process.env.API_PATH_ROOT || "/v1/user";

const app = express();
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
  const mongoClient = await connectMongo();

  //Only for internal use, should be protected from public access
  app.use(
    getInternalApiPath(api_path_root, "detail"),
    createUserInternalRouter(mongoClient)
  );

  //For AuthZ use
  app.use(
    getApiPath(api_path_root, "detail"),
    authorize,
    createUserDetailsRouter(mongoClient)
  );

  //For public/non-AuthZ use
  app.use(getApiPath(api_path_root, "signup"), createSignUpRouter(mongoClient));
  app.use(
    getApiPath(api_path_root, "userid"),
    createUserIdRouter(mongoClient, redisClient)
  );
  app.use(getApiPath(api_path_root, "signin"), createSignInRouter(mongoClient));
  app.use(
    getApiPath(api_path_root, "check-username"),
    createCheckUsernameRouter(mongoClient)
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
        message: error,
        path: req.url,
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

main();
