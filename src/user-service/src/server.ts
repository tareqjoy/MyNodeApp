import express from 'express';
import 'reflect-metadata';
import { connectMongo, connectRedis } from '@tareqjoy/clients';
import { createSignUpRouter} from "./routes/signup";
import { createUserDetailsRouter } from "./routes/user";
import { createUserInternalRouter } from "./routes/user-internal";
import bodyParser from "body-parser";
import * as log4js from "log4js";
import { createSignInRouter } from './routes/signin';
import 'source-map-support/register';

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5002;

const api_path_detail = process.env.API_PATH_DETAIL || '/v1/user/detail';
const api_path_signup = process.env.API_PATH_SIGNUP || '/v1/user/signup';
const api_path_userid = process.env.API_PATH_USERID || '/v1/user/userid';
const api_path_signin = process.env.API_PATH_SIGN_IN || '/v1/user/signin';

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

  const redisClient = await connectRedis();
  const mongoClient = await connectMongo();
  
  app.use(api_path_detail, createUserDetailsRouter(mongoClient));
  app.use(api_path_signup, createSignUpRouter(mongoClient));
  app.use(api_path_userid, createUserInternalRouter(mongoClient, redisClient));
  app.use(api_path_signin, createSignInRouter(mongoClient, redisClient));
  
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

      await mongoClient.disconnect();
      logger.info(`MongoDB disconnected`);
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during disconnect:', error);
    }
  });
}


main();