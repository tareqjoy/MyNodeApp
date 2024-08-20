import * as log4js from "log4js";

import { Consumer, Kafka } from 'kafkajs';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';

export async function connectKafkaConsumer(clientId: string, groupName: string, topic: string): Promise<Consumer> {
    logger.info(`Will listen kafka at ${kafka_host_port}`);
    const fanoutKafka = new Kafka({
        clientId: clientId,
        brokers: [kafka_host_port]
    });
      
    const newPostConsumer = fanoutKafka.consumer({ groupId: groupName });
    await newPostConsumer.connect();
    logger.info(`Connected to kafka producer on ${kafka_host_port}, group: ${groupName}`);
    
    await newPostConsumer.subscribe({ topic: topic, fromBeginning: true});
    logger.info(`Subscribed to topic: ${topic}`);

    return newPostConsumer;
}

