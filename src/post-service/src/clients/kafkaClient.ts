import * as log4js from "log4js";

import { Kafka } from 'kafkajs';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'timeline';
const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';


logger.info(`Will listen kafka at ${kafka_host_port}`);
const fanoutKafka = new Kafka({
    clientId: kafka_client_id,
    brokers: [kafka_host_port]
});
  
export const kafkaNewPostProducer = fanoutKafka.producer();
kafkaNewPostProducer.connect();
logger.info(`Connected to kafka producer on ${kafka_host_port}`);