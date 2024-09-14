import express from 'express';
import * as log4js from "log4js";
import { createSearchRouter } from './routes/SearchRouter';
import { connectElasticSearch } from '@tareqjoy/clients';

const logger = log4js.getLogger();
logger.level = "trace";

const api_path_root = process.env.API_PATH_ROOT || '/v1/search';

// Create an instance of the express application
const app=express();
const bodyParser = require("body-parser")
// Specify a port number for the server
const port= process.env.PORT || 5006;

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}


async function main() {
  app.use(bodyParser.json());

  const elasticSearchClient =  await connectElasticSearch();

  app.use(api_path_root, createSearchRouter(elasticSearchClient));
  

  // Start the server and listen to the port
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  process.on('SIGINT', async () => {
    try {
      logger.info('Caught interrupt signal, shutting down...');
      process.exit(0);
    } catch (error) {
      logger.error('Error during disconnect:', error);
    }
  });
}

main();
