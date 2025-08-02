import mongoose, { Mongoose } from "mongoose";

import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const mongoUrl =
  process.env.MONGODB_URL ||
  "mongodb://admin:admin@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/mydatabase?replicaSet=rs0";

const mongoOptions = {
  maxPoolSize: 100,
  minPoolSize: 10,
};

export async function connectMongo(): Promise<Mongoose> {
  const mongoClient = await mongoose.connect(mongoUrl, mongoOptions);
  logger.info(`Connected to MongoDB`);
  return mongoClient!;
}
