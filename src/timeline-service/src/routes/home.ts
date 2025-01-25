import express from "express";
import * as log4js from "log4js";
import { RedisClientType } from "redis";
import axios from "axios";
import {
  FollowersReqInternal,
  FollowersRes,
  GetPostByUserReq,
  InternalServerError,
  InvalidRequest,
  PostDetailsRes,
  TimelineHomePaging,
  TimelineHomePagingRaw,
  TimelineHomePost,
  TimelineHomeReq,
  TimelineHomeRes,
  UserInternalReq,
  UserInternalRes,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ATTR_HEADER_USER_ID, getInternalFullPath } from "@tareqjoy/utils";

const logger = log4js.getLogger();
logger.level = "trace";

const iFollowUrl: string =
  process.env.I_FOLLOW_URL || "http://127.0.0.1:5003/v1/follower/i-follow/";
const getPostByUserUrl: string =
  process.env.GET_POST_BY_USER_URL ||
  "http://127.0.0.1:5005/v1/post/get-by-user/";

const router = express.Router();

export const createHomeRouter = (
  redisClient: RedisClientType<any, any, any>,
) => {
  router.post("/", async (req, res, next) => {
    logger.trace(`POST /home called`);

    if (!req.headers || !req.headers[ATTR_HEADER_USER_ID]) {
      res
        .status(400)
        .json(new InvalidRequest(`$${ATTR_HEADER_USER_ID} header missing`));
    }

    const timelineHomeReq = plainToInstance(TimelineHomeReq, req.body);
    const errors = await validate(timelineHomeReq);

    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    try {
      let pagingRaw: TimelineHomePagingRaw | undefined = undefined;
      if (timelineHomeReq.nextToken) {
        try {
          const rawPagingJson = JSON.parse(
            Buffer.from(timelineHomeReq.nextToken, "base64").toString("utf-8"),
          );
          logger.trace(rawPagingJson);
          pagingRaw = plainToInstance(TimelineHomePagingRaw, rawPagingJson);
          logger.trace(pagingRaw.type);
        } catch (error) {
          res.status(400).json(new InvalidRequest("Invalid nextToken"));
          return;
        }
      }

      const userId: string = req.headers[ATTR_HEADER_USER_ID] as string;
      const redisKey = `timeline-userId:${userId}`;

      let redisCursor = 0;
      if (pagingRaw) {
        redisCursor = Number(pagingRaw.id);
      }

      const postsToReturn: TimelineHomePost[] = [];

      if (!pagingRaw?.type || (pagingRaw?.type == "r" && redisCursor >= 0)) {
        // https://redis.io/docs/latest/commands/scan/
        // The COUNT might not be respected in the return
        const redisScanReply = await redisClient.zScan(redisKey, redisCursor, {
          COUNT: timelineHomeReq.limit,
        });

        redisScanReply.members.forEach((redisData) => {
          postsToReturn.push(
            new TimelineHomePost(redisData.value, redisData.score),
          );
        });

        logger.trace("loaded from redis: ", postsToReturn.length);

        if (postsToReturn.length >= timelineHomeReq.limit) {
          const pagingObj = new TimelineHomePagingRaw(
            "r",
            redisScanReply.cursor == 0 ? "-1" : String(redisScanReply.cursor),
          );
          const pagingJsonString = JSON.stringify(pagingObj);
          const nextPageToken =
            Buffer.from(pagingJsonString).toString("base64");

          res
            .status(200)
            .json(
              new TimelineHomeRes(
                postsToReturn,
                new TimelineHomePaging(nextPageToken),
              ),
            );
          return;
        }
      }
      // postsToReturn.length < timelineHomeReq.limit
      let lastPostId = undefined;
      if (postsToReturn.length > 0) {
        //partially loaded on redis
        lastPostId = postsToReturn[postsToReturn.length - 1].postId;
      } else if (pagingRaw?.type == "m" && pagingRaw?.id) {
        //requested with 'm' in mind
        lastPostId = pagingRaw.id;
      } //else no data from redis, request type was 'r' but redis had 0 data

      const iFollowReq = new FollowersReqInternal(userId);
      const iFollowAxiosRes = await axios.post(
        getInternalFullPath(iFollowUrl),
        iFollowReq,
      );
      const iFollowIdsObj = plainToInstance(FollowersRes, iFollowAxiosRes.data);

      const morePostToLoad = timelineHomeReq.limit - postsToReturn.length;
      const postByUserReq = new GetPostByUserReq(iFollowIdsObj.userIds, false, {
        lastPostId: lastPostId,
        limit: morePostToLoad,
        returnOnlyPostId: true,
      });

      const postByUserAxiosRes = await axios.post(
        getInternalFullPath(getPostByUserUrl),
        postByUserReq,
      );
      const postDetailsResObj = plainToInstance(
        PostDetailsRes,
        postByUserAxiosRes.data,
      );

      for (const post of postDetailsResObj.posts) {
        postsToReturn.push(new TimelineHomePost(post.postId, post.time));
      }

      let pageTokenObj: TimelineHomePaging | undefined;
      if (postDetailsResObj.paging?.lastPostId) {
        const pageLastPostIdStr = postDetailsResObj.paging?.lastPostId;
        const pagingObj = new TimelineHomePagingRaw("m", pageLastPostIdStr);
        const pagingJsonString = JSON.stringify(pagingObj);
        const nextPageToken = Buffer.from(pagingJsonString).toString("base64");
        pageTokenObj = new TimelineHomePaging(nextPageToken);
      }
      logger.trace(
        "loaded from post service/mongodb: ",
        postDetailsResObj.posts.length,
      );
      res.status(200).json(new TimelineHomeRes(postsToReturn, pageTokenObj));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /new-post: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
        );
      } else {
        logger.error("Error while /new-post: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
