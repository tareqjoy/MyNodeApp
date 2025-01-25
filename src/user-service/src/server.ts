import express from "express";
import "reflect-metadata";
import { connectMongo, connectRedis } from "@tareqjoy/clients";
import { createSignUpRouter } from "./routes/signup";
import { createUserDetailsRouter } from "./routes/user";
import { createUserInternalRouter } from "./routes/user-internal";
import bodyParser from "body-parser";
import * as log4js from "log4js";
import { createSignInRouter } from "./routes/signin";
import "source-map-support/register";
import {
  authorize,
  commonServiceMetricsMiddleware,
  getApiPath,
} from "@tareqjoy/utils";

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5002;

const api_path_root = process.env.API_PATH_ROOT || "/v1/user";

const app = express();

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

  const redisClient = await connectRedis();
  const mongoClient = await connectMongo();

  //For public AuthZ use
  app.use(
    getApiPath(api_path_root, "detail"),
    authorize,
    createUserDetailsRouter(mongoClient),
  );

  //For public non-AuthZ use
  app.use(getApiPath(api_path_root, "signup"), createSignUpRouter(mongoClient));
  app.use(
    getApiPath(api_path_root, "userid"),
    createUserInternalRouter(mongoClient, redisClient),
  );
  app.use(getApiPath(api_path_root, "signin"), createSignInRouter(mongoClient));

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
        path: req.url,
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
