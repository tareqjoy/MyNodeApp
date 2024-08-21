import express from 'express';
import 'reflect-metadata';
import bodyParser from "body-parser";
import { createTimelineRouter } from "./routes/TimelineRouter";
import { connectRedis } from '@tareqjoy/clients';

import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5001;
const api_path_root = process.env.API_PATH_ROOT || '/v1/timeline';

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

  const redisClient = await connectRedis();

  app.use(api_path_root, createTimelineRouter(redisClient));

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
      await redisClient.quit();
      logger.info(`Redis disconnected`);
      process.exit(0);
    } catch (error) {
      logger.error('Error during disconnect:', error);
    }
  });
}

main();