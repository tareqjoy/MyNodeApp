import mongoose, { Mongoose } from 'mongoose';

import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const mongouser = process.env.MONGODB_USER || "admin";
const mongoppass = process.env.MONGODB_PASS || "admin";
const mongoport = process.env.MONGODB_PORT || 27017;
const mongohost = process.env.MONGODB_HOST || "127.0.0.1";
const mongodatabase = process.env.MONGODB_DATABASE || "mydatabase";

const mongoUrl = `mongodb://${mongouser}:${mongoppass}@${mongohost}:${mongoport}/${mongodatabase}`;

const mongoOptions = {
    maxPoolSize: 100,
    minPoolSize: 10
};

export async function connectMongo(): Promise<Mongoose> {
  const mongoClient = await mongoose.connect(mongoUrl, mongoOptions);
  logger.info(`Connected to MongoDB at port ${mongoport}`);
  return mongoClient!;
}

