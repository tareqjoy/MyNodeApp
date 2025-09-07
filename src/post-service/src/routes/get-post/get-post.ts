import express from "express";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import {
  TooLargeRequest,
  GetPostReq,
  InternalServerError,
} from "@tareqjoy/models";
import { Post } from "@tareqjoy/clients";
import { InvalidRequest } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { toResPosts } from "../common/common";
import axios from "axios";
import { RedisClientType } from "redis";

const logger = getFileLogger(__filename);

const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";
const maxGetPostLimit: number = parseInt(
  process.env.MAX_GET_POST_LIMIT || "100",
);

const router = express.Router();

export const createGetRouter = (mongoClient: Mongoose, redisClient: RedisClientType<any, any, any>,) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /get called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    try {
      const getPostReq = plainToInstance(GetPostReq, req.body);
      const errors = await validate(getPostReq);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }
      const postIds = getPostReq.getNormalizedPostIds();
      if (postIds.length > maxGetPostLimit) {
        res.status(403).json(new TooLargeRequest(maxGetPostLimit));
        return;
      }

      const postObjectIds: mongoose.Types.ObjectId[] = [];
      try {
        postIds.forEach((item: string) => {
          if (mongoose.Types.ObjectId.isValid(item)) {
            postObjectIds.push(new mongoose.Types.ObjectId(item));
          }
        });
      } catch (error) {
        logger.error("Error parsing json: ", error);
        res.status(400).json({ error: "Invalid ids" });
        return;
      }

      const dbPosts = await Post.find({
        _id: { $in: Array.from(postObjectIds) },
      })

      res
        .status(200)
        .json(
          await toResPosts(
            redisClient,
            userServiceHostUrl,
            dbPosts,
            false,
            getPostReq.returnAsUsername,
            loggedInUserId
          ),
        );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /get: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /get: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;

};

