import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import axios from "axios";
import {
  GetPostByUserReq,
  UserInternalReq,
  UserInternalRes,
  InternalServerError,
  PostByUserPagingRaw,
  Post,
} from "@tareqjoy/models";
import { InvalidRequest } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  toResPosts,
  getTimeSortedGetPostIdsByUserListQuery,
} from "./common/common";

const logger = getFileLogger(__filename);

const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

export const createGetByUserRouter = (mongoClient: Mongoose) => {
  const router = express.Router();
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /get-by-user called`);
    try {
      const getPostReq = plainToInstance(GetPostByUserReq, req.body);
      const errors = await validate(getPostReq);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }
      const userIds: Set<string> = new Set();
      if (getPostReq.userIds) {
        for (const id of getPostReq.userIds) {
          userIds.add(id);
        }
      }
      if (getPostReq.usernames) {
        const pUserInternalReq = new UserInternalReq(
          getPostReq.usernames,
          true
        );
        const pUserIdAxiosResponse = await axios.post(
          userServiceHostUrl,
          pUserInternalReq
        );
        const pUserResObj = plainToInstance(
          UserInternalRes,
          pUserIdAxiosResponse.data
        );

        for (const key in pUserResObj.toUserIds) {
          userIds.add(pUserResObj.toUserIds[key]);
        }
      }

      const userMongoIds: mongoose.Types.ObjectId[] = [];

      userIds.forEach((item: string) => {
        if (mongoose.Types.ObjectId.isValid(item)) {
          userMongoIds.push(new mongoose.Types.ObjectId(item));
        }
      });

      const projection = getPostReq.returnOnlyPostId ? { _id: 1, time: 1 } : {};

      var lastPostTime: number = Date.now();
      var lastPostId: string | undefined = undefined;
      if (getPostReq.pagingInfo) {
        lastPostTime = getPostReq.pagingInfo.lastPostTime;
        lastPostId = getPostReq.pagingInfo.lastPostId;
      } else if (getPostReq.nextToken) {
        try {
          const rawPagingJson = JSON.parse(
            Buffer.from(getPostReq.nextToken, "base64").toString("utf-8")
          );
          const pagingRawObj = plainToInstance(
            PostByUserPagingRaw,
            rawPagingJson
          );
          lastPostTime = pagingRawObj.lastPostTime;
          lastPostId = pagingRawObj.lastPostId;
        } catch (error) {
          res.status(400).json(new InvalidRequest("Invalid nextToken"));
          return;
        }
      }

      const dbPosts = await Post.find(
        getTimeSortedGetPostIdsByUserListQuery(
          userMongoIds,
          lastPostTime,
          lastPostId
        ),
        projection
      )
        .sort({ time: -1, _id: -1 })
        .limit(getPostReq.limit);

      logger.debug(`returned posts from mongodb: ${dbPosts.length}`);

      var paging: PostByUserPagingRaw | undefined;
      if (dbPosts.length == getPostReq.limit) {
        const lastPost = dbPosts[dbPosts.length - 1];
        paging = new PostByUserPagingRaw(lastPost.time, lastPost.id.toString());
      }
      res
        .status(200)
        .json(
          await toResPosts(
            userServiceHostUrl,
            dbPosts,
            getPostReq.returnOnlyPostId,
            getPostReq.returnAsUsername,
            paging
          )
        );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /get-by-user: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /get-by-user: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
