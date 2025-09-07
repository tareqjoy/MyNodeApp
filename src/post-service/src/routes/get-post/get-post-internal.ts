import express from "express";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import {
  InternalServerError,
} from "@tareqjoy/models";
import { Post } from "@tareqjoy/clients";
import { InvalidRequest } from "@tareqjoy/models";
import { toResPostsOnly } from "../common/common";
import axios from "axios";
import { RedisClientType } from "redis";

const logger = getFileLogger(__filename);

const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";
const maxGetPostLimit: number = parseInt(
  process.env.MAX_GET_POST_LIMIT || "100"
);

const router = express.Router();

export const createInternalGetRouter = (
  mongoClient: Mongoose,
  redisClient: RedisClientType<any, any, any>
) => {
  router.get("/:postId", async (req, res, next) => {
    logger.silly(`POST /get called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    try {
      const postId = req.params.postId;
      if (!postId || typeof postId !== "string") {
        res
          .status(400)
          .json(new InvalidRequest("postId parameter is required"));
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(postId)) {
        res
          .status(400)
          .json(new InvalidRequest("postId parameter is invalid"));
        return;
      }
      const postObjectId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(postId);

      const dbPosts = await Post.find({
        _id: postObjectId,
      });

      res.status(200).json(await toResPostsOnly(dbPosts));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /get: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
        );
      } else {
        logger.error("Error while /get: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
