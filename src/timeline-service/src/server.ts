import express from 'express';
import mongoose from 'mongoose';
import bodyParser from "body-parser";
import { router } from "./routes/timeline";
import { Kafka, Producer, logLevel } from 'kafkajs';
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5001;
const mongouser = process.env.MONGODB_USER || "admin";
const mongoppass = process.env.MONGODB_PASS || "admin";
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";
export const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";
const api_path_root = process.env.API_PATH_ROOT || '/v1/timeline';
const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'timeline';
const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';
export const kafka_fanout_topic = process.env.KAFKA_FANOUT_TOPIC || 'new-post';

const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10
};

const mongoUrl = `mongodb://${mongouser}:${mongoppass}@${mongohost}:${mongoport}/${mongodatabase}`;
mongoose.connect(mongoUrl, mongoOptions);

export const app=express(); 

class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode || 500;
  }
}

logger.info(`Will listen kafka at ${kafka_host_port}`);
const fanoutKafka = new Kafka({
  clientId: kafka_client_id,
  brokers: [kafka_host_port]
});

export const fanoutProducer = fanoutKafka.producer();
fanoutProducer.connect();


app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(api_path_root, router);

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
    console.log('Caught interrupt signal, shutting down...');
    fanoutProducer.disconnect();
    console.log(`Producer disconnected`);
    process.exit(0);
  } catch (error) {
    console.error('Error during disconnect:', error);
  }
});