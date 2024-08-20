import express from 'express';
import 'reflect-metadata';
import bodyParser from "body-parser";
import { createPostRouter } from "./routes/PostRouter";
import { connectKafkaProducer, connectMongo } from "@tareqjoy/clients";
import * as log4js from "log4js";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'post';

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5005;
const api_path_root = process.env.API_PATH_ROOT || '/v1/post';

export const app=express(); 

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(bodyParser.json());

  const kafkaNewPostProducer = connectKafkaProducer(kafka_client_id);
  const mongoClient = await connectMongo();
  app.use(api_path_root, createPostRouter(mongoClient, kafkaNewPostProducer));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = new HttpError('Not found', 404);
    next(error);
  });

  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(error.statusCode || 500);
    res.json({
      message: error
    })
  });

  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on('SIGINT', async () => {
    try {
      logger.info('Caught interrupt signal, shutting down...');
      kafkaNewPostProducer.disconnect();
      logger.info(`Producer disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error('Error during disconnect:', error);
    }
  });
}


main();