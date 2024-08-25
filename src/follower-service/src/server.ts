import express from 'express';
import { createFollowerRouter } from "./routes/FollowerRouter";
import { connectNeo4jDriver, connectKafkaProducer } from "@tareqjoy/clients";
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const api_path_root = process.env.API_PATH_ROOT || '/v1/follower';
const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'follower';

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


async function main() {
  const neo4jDriver = await connectNeo4jDriver();
  const kafkaNewPostProducer = await connectKafkaProducer(kafka_client_id);
  app.use(bodyParser.json());

  app.use(api_path_root, createFollowerRouter(neo4jDriver, kafkaNewPostProducer));

  // Start the server and listen to the port
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  process.on('SIGINT', async () => {
    try {
      logger.info('Caught interrupt signal, shutting down...');
      neo4jDriver.close();
      logger.info(`Neo4j session disconnected`);
      await kafkaNewPostProducer.disconnect();
      logger.info(`Producer disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error('Error during disconnect:', error);
    }
  });
}

main();
