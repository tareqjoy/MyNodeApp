import * as log4js from "log4js";

import { Kafka, Producer } from "kafkajs";

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_host_port = process.env.KAFKA_HOST_PORT || "localhost:9092";

export async function connectKafkaProducer(
  clientId: string,
): Promise<Producer> {
  logger.info(`Will listen kafka at ${kafka_host_port}`);
  const fanoutKafka = new Kafka({
    clientId: clientId,
    brokers: [kafka_host_port],
  });

  const kafkaNewPostProducer = fanoutKafka.producer();
  await kafkaNewPostProducer.connect();
  logger.info(`Connected to kafka producer on ${kafka_host_port}`);
  return kafkaNewPostProducer;
}
