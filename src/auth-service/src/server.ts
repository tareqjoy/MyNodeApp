import express from 'express';
import 'reflect-metadata';
import { connectRedis } from '@tareqjoy/clients';
import bodyParser from "body-parser";
import * as log4js from "log4js";
import 'source-map-support/register';
import { createSignInRouter } from './routes/auth-signin';
import { getApiPath } from '@tareqjoy/utils';
import { createVerifyRouter } from './routes/auth-verify';
import { createRefreshRouter } from './routes/auth-refresh';
import { createSignOutRouter } from './routes/auth-signout';
import cors from 'cors';
import { createAuthorizeClientRouter } from './routes/authorize-client';

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5007;

const api_path_auth_root = process.env.API_PATH_AUTH || '/v1/auth/';

const app = express();

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

async function main() {
  app.use(cors({
    origin: 'http://localhost:5000',
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'Device-ID', 'Authorization']
  }));

  app.use(bodyParser.json());

  const redisClient = await connectRedis();
  app.use(express.urlencoded({extended: true}));
  app.use(getApiPath(api_path_auth_root, 'signin'), createSignInRouter(redisClient));
  app.use(getApiPath(api_path_auth_root, 'verify'), createVerifyRouter());
  app.use(getApiPath(api_path_auth_root, 'refresh'), createRefreshRouter(redisClient));
  app.use(getApiPath(api_path_auth_root, 'signout'), createSignOutRouter(redisClient));
  app.use(getApiPath(api_path_auth_root, 'authorize'), createAuthorizeClientRouter(redisClient));

  
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = new HttpError('Not found', 404);
    next(error);
  });
  
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(error.statusCode || 500);
    res.json({
      message: error,
      path: req.url
    })
  });
  
  
  // Start the server and listen to the port
  app.listen(appport, () => {
    logger.info(`Server is running on port ${appport}`);
  });

  process.on('SIGINT', async () => {
    try {
      logger.info('Caught interrupt signal, shutting down...');
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
}


main();