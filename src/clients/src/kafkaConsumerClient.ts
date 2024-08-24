import * as log4js from "log4js";

import { Consumer, Kafka } from 'kafkajs';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_host_port = process.env.KAFKA_HOST_PORT || 'localhost:9092';

export async function connectKafkaConsumer(clientId: string, groupName: string, topic: string | string[]): Promise<Consumer> {
    logger.info(`Will listen kafka at ${kafka_host_port}`);
    const fanoutKafka = new Kafka({
        clientId: clientId,
        brokers: [kafka_host_port]
    });
      
    const consumer = fanoutKafka.consumer({ groupId: groupName });
    await consumer.connect();
    logger.info(`Connected to kafka producer on ${kafka_host_port}, group: ${groupName}`);
    
    const topics: string[] = []
    if (typeof topic == "string") {
        topics.push(topic);
    } else {
        topics.push(...topic);
    }

    for(const t of topics) {
        await consumer.subscribe({ topic: t, fromBeginning: true});
        logger.info(`Subscribed to topic: ${t}`);
    }

    return consumer;
}

