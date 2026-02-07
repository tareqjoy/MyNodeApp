import express from "express";
import { RedisClientType } from "redis";
import axios from "axios";
import {
  InvalidRequest,
  InternalServerError,
  TrendingReq,
  TrendingPost,
  TrendingRes,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  getFileLogger,
} from "@tareqjoy/utils";
import { postLoadCount } from "../metrics/metrics";

const logger = getFileLogger(__filename);


const router = express.Router();

const topk1hKey = process.env.TOPK_1H_KEY || "topk:likes:global:1h";
const topk24hKey = process.env.TOPK_24H_KEY || "topk:likes:global:24h";
const topk30dKey = process.env.TOPK_30D_KEY || "topk:likes:global:30d";

export const createTrendingRouter = (
  redisClient: RedisClientType<any, any, any, any>
) => {
  router.get("/", async (req, res, next) => {
    const trendingReq = plainToInstance(TrendingReq, req.query, {
      enableImplicitConversion: true,
    });
    const errors = await validate(trendingReq);

    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    const window = trendingReq.window || "24h";
    const limit = trendingReq.limit || 100;

    let topkKey = topk24hKey;
    if (window === "1h") {
      topkKey = topk1hKey;
    } else if (window === "30d") {
      topkKey = topk30dKey;
    }

    try {
      const redisRangeReply = await redisClient.zRangeWithScores(
        topkKey,
        "+inf",
        "-inf",
        { REV: true, BY: "SCORE", LIMIT: { offset: 0, count: limit } },
      );

      const posts: TrendingPost[] = redisRangeReply.map(
        (entry: { value: string; score: number }) =>
          new TrendingPost(entry.value, entry.score),
      );

      postLoadCount.inc({ source: "redis" }, posts.length);
      res.status(200).json(new TrendingRes(window, posts));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /trending: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
        );
      } else {
        logger.error("Error while /trending: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
