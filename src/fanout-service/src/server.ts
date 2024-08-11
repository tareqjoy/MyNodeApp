import express from 'express';
import { Kafka, Consumer, logLevel } from 'kafkajs';
import * as log4js from "log4js";
import { router } from "./routes/fanout";
import bodyParser from "body-parser";

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5004;
const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'fanout';
const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';
export const kafka_fanout_topic = process.env.KAFKA_FANOUT_TOPIC || 'new-post';
const kafka_fanout_group = process.env.KAFKA_FANOUT_GROUP || 'fanout-group';
const api_path_root = process.env.API_PATH_ROOT || '/v1/fanout';

const app=express();


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

export const fanoutConsumer = fanoutKafka.consumer({ groupId: kafka_fanout_group });
fanoutConsumer.connect();
logger.info(`Connected to group: ${kafka_fanout_group}`);

fanoutConsumer.subscribe({ topic: kafka_fanout_topic, fromBeginning: true});
logger.info(`Subscribed to topic: ${kafka_fanout_topic}`);

fanoutConsumer.run({
  eachMessage: async({ topic, partition, message}) => {
      logger.info({topic, partition, offset: message.offset, value: message.value?.toString()})
  }
});

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
  console.log(`Server is running on port ${appport}`);
});

process.on('SIGINT', async () => {
  try {
    console.log('Caught interrupt signal, shutting down...');
    fanoutConsumer.disconnect();
    console.log(`Consumer disconnected`);
    process.exit(0);
  } catch (error) {
    console.error('Error during disconnect:', error);
  }
});