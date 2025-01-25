import express from "express";
import "reflect-metadata";
import { connectNeo4jDriver, connectKafkaProducer } from "@tareqjoy/clients";
import * as log4js from "log4js";
import { createFollowRouter } from "./routes/follow";
import {
  authorize,
  commonServiceMetricsMiddleware,
  getApiPath,
  getInternalApiPath,
} from "@tareqjoy/utils";
import { createUnfollowRouter } from "./routes/unfollow";
import { createIFollowRouter } from "./routes/i-follow";
import { createWhoFollowsMeRouter } from "./routes/who-follows-me";

const logger = log4js.getLogger();
logger.level = "trace";

const api_path_root = process.env.API_PATH_ROOT || "/v1/follower";
const kafka_client_id = process.env.KAFKA_CLIENT_ID || "follower";

// Create an instance of the express application
const app = express();
const bodyParser = require("body-parser");
// Specify a port number for the server
const port = process.env.PORT || 5003;

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(commonServiceMetricsMiddleware(api_path_root));
  const neo4jDriver = await connectNeo4jDriver();
  const kafkaNewPostProducer = await connectKafkaProducer(kafka_client_id);
  app.use(bodyParser.json());

  //Only for internal use, should be protected from public access
  app.use(
    getInternalApiPath(api_path_root, "i-follow"),
    createIFollowRouter(neo4jDriver, true),
  );
  app.use(
    getInternalApiPath(api_path_root, "who-follows-me"),
    createWhoFollowsMeRouter(neo4jDriver, true),
  );

  //For public use
  app.use(
    getApiPath(api_path_root, "follow"),
    authorize,
    createFollowRouter(neo4jDriver, kafkaNewPostProducer),
  );
  app.use(
    getApiPath(api_path_root, "unfollow"),
    authorize,
    createUnfollowRouter(neo4jDriver, kafkaNewPostProducer),
  );
  app.use(
    getApiPath(api_path_root, "i-follow"),
    authorize,
    createIFollowRouter(neo4jDriver, false),
  );
  app.use(
    getApiPath(api_path_root, "who-follows-me"),
    authorize,
    createWhoFollowsMeRouter(neo4jDriver, false),
  );

  // Start the server and listen to the port
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  process.on("SIGINT", async () => {
    try {
      logger.info("Caught interrupt signal, shutting down...");
      neo4jDriver.close();
      logger.info(`Neo4j session disconnected`);
      await kafkaNewPostProducer.disconnect();
      logger.info(`Producer disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error("Error during disconnect:", error);
    }
  });
}

main();
