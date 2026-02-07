import express from "express";
import { RedisClientType } from "redis";
import axios from "axios";
import {

} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ATTR_HEADER_USER_ID,
  getInternalFullPath,
  getFileLogger,
} from "@tareqjoy/utils";
import { postLoadCount } from "../metrics/metrics";

const logger = getFileLogger(__filename);


const router = express.Router();

export const createTrendingRouter = (
  redisClient: RedisClientType<any, any, any, any>
) => {
  router.get("/", async (req, res, next) => {

  });

  return router;
};

