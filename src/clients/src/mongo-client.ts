import mongoose, { Mongoose } from "mongoose";

import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const mongoUrl =
  process.env.MONGODB_URL ||
  "mongodb://admin:admin@192.168.0.10:27017,192.168.0.10:27018,192.168.0.10:27019/mydatabase?replicaSet=rs0";

const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10,
};

export async function connectMongo(): Promise<Mongoose> {
  const mongoClient = await mongoose.connect(mongoUrl, mongoOptions);
  logger.info(`Connected to MongoDB`);
  return mongoClient!;
}
