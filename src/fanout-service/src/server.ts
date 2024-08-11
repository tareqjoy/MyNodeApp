import express from 'express';
import { Kafka, Consumer, logLevel } from 'kafkajs';
import { createClient } from 'redis'
import * as log4js from "log4js";
import { router } from "./routes/fanout";
import { newPostFanout } from "./workers/new-post"
import bodyParser from "body-parser";

const logger = log4js.getLogger();
logger.level = "trace";

const appport = process.env.PORT || 5004;
const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'fanout';
const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';
const redis_host_port = process.env.REDIS_HOST_PORT || 'redis://192.168.0.10:6379';
const kafka_fanout_topic = process.env.KAFKA_FANOUT_TOPIC || 'new-post';
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

async function main() {

  const redisClient = await createClient( { url: redis_host_port })
    .on('error', err => logger.error('Redis client error: ', err))
    .on('ready', () => logger.info('Redis client is ready'))
    .connect();


  logger.info(`Will listen kafka at ${kafka_host_port}`);
  const fanoutKafka = new Kafka({
      clientId: kafka_client_id,
      brokers: [kafka_host_port]
    });
  
  const fanoutConsumer = fanoutKafka.consumer({ groupId: kafka_fanout_group });
  fanoutConsumer.connect();
  logger.info(`Connected to group: ${kafka_fanout_group}`);

  fanoutConsumer.subscribe({ topic: kafka_fanout_topic, fromBeginning: true});
  logger.info(`Subscribed to topic: ${kafka_fanout_topic}`);

  fanoutConsumer.run({
    eachMessage: async({ topic, partition, message}) => {
        logger.trace("Kafka message received: " + {topic, partition, offset: message.offset, value: message.value?.toString()});
        
        if (message.value != undefined) {
          newPostFanout(redisClient, message.value?.toString());
        } else {
          logger.warn(`Message value undefined`);
        }
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
    
      redisClient.quit();
      console.log(`Redis disconnected`);
      process.exit(0);
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  });
};


main()


