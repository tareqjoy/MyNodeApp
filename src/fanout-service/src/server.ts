import express from 'express';
import bodyParser from "body-parser";
import * as log4js from "log4js";

import { newPostConsumer } from './clients/kafkaClient';
import { redisClient } from './clients/redisClient';
import { createFanoutRouter } from "./routes/fanout";
import { newPostFanout } from "./workers/new-post"


const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5004;
const api_path_root = process.env.API_PATH_ROOT || '/v1/fanout';

const app=express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  newPostConsumer.run({
    eachMessage: async({ topic, partition, message}) => {
        logger.trace("Kafka message received: ", {topic, partition, offset: message.offset, value: message.value?.toString()});
        
        if (message.value != undefined) {
          newPostFanout(redisClient, message.value?.toString());
        } else {
          logger.warn(`Message value undefined`);
        }
    }
  });

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  app.use(api_path_root, createFanoutRouter(redisClient));

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
};

process.on('SIGINT', async () => {
  try {
    logger.info('Caught interrupt signal, shutting down...');
    newPostConsumer.disconnect();
    logger.info(`Consumer disconnected`);

    if (redisClient.isOpen) {
      await redisClient.quit();
      logger.info(`Redis disconnected`);
    } else {
      logger.info(`Redis was not connected at the first place`);
    }
    process.exit(0);
  } catch (error) {
    logger.error('Error during disconnect:', error);
  }
});

main()


