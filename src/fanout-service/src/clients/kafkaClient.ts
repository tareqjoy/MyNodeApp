import * as log4js from "log4js";

import { Kafka } from 'kafkajs';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_client_id = process.env.KAFKA_CLIENT_ID || 'fanout';
const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';
const kafka_new_post_fanout_topic = process.env.KAFKA_NEW_POST_FANOUT_TOPIC || 'new-post';
const kafka_fanout_group = process.env.KAFKA_FANOUT_GROUP || 'fanout-group';

logger.info(`Will listen kafka at ${kafka_host_port}`);
const fanoutKafka = new Kafka({
    clientId: kafka_client_id,
    brokers: [kafka_host_port]
});
  
export const newPostConsumer = fanoutKafka.consumer({ groupId: kafka_fanout_group });
newPostConsumer.connect();
logger.info(`Connected to kafka producer on ${kafka_host_port}, group: ${kafka_fanout_group}`);

newPostConsumer.subscribe({ topic: kafka_new_post_fanout_topic, fromBeginning: true});
logger.info(`Subscribed to topic: ${kafka_new_post_fanout_topic}`);