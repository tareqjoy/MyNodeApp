import express from 'express';
import { createFollowerRouter } from "./routes/follow";
import { neo4jDriver } from "./clients/neo4jClient";
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const api_path_root = process.env.API_PATH_ROOT || '/v1/follower';

// Create an instance of the express application
const app=express();
const bodyParser = require("body-parser")
// Specify a port number for the server
const port= process.env.PORT || 5003;


class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}
const neo4jSession = neo4jDriver.session();

async function main() {
  app.use(bodyParser.json());

  app.use(api_path_root, createFollowerRouter(neo4jSession));

  // Start the server and listen to the port
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
}

main();

process.on('SIGINT', async () => {
  try {
    neo4jSession.close();
    logger.info(`Neo4j session disconnected`);

    logger.info('Caught interrupt signal, shutting down...');
    neo4jDriver.close();
    logger.info(`Neo4j driver disconnected`);
    process.exit(0);
  } catch (error) {
    logger.error('Error during disconnect:', error);
  }
});