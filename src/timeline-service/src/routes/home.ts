import express from "express";
import { RedisClientType } from "redis";
import axios from "axios";
import {
  FollowersReqInternal,
  FollowersRes,
  GetPostByUserReq,
  InternalServerError,
  InvalidRequest,
  PostByUserPagingRaw,
  PostDetailsRes,
  TimelineHomePaging,
  TimelineHomePagingRaw,
  TimelineHomePost,
  TimelineHomeReq,
  TimelineHomeRes,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ATTR_HEADER_USER_ID,
  getInternalFullPath,
  getFileLogger,
} from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const iFollowUrl: string =
  process.env.I_FOLLOW_URL || "http://127.0.0.1:5003/v1/follower/i-follow/";
const getPostByUserUrl: string =
  process.env.GET_POST_BY_USER_URL ||
  "http://127.0.0.1:5005/v1/post/get-by-user/";

const router = express.Router();

export const createHomeRouter = (
  redisClient: RedisClientType<any, any, any>
) => {
  router.post("/", async (req, res, next) => {
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
            Buffer.from(timelineHomeReq.nextToken, "base64").toString("utf-8")
          );
          pagingRaw = plainToInstance(TimelineHomePagingRaw, rawPagingJson);
        } catch (error) {
          res.status(400).json(new InvalidRequest("Invalid nextToken"));
          return;
        }
      }

      const userId: string = req.headers[ATTR_HEADER_USER_ID] as string;

      const postsToReturn: TimelineHomePost[] = [];
      let potentialPagingRaw: TimelineHomePagingRaw | undefined = undefined;

      if (!pagingRaw?.type || pagingRaw?.type == "r") {
        const [postsFromRedis, redisPagingRaw] = await getFromRedis(
          redisClient,
          userId,
          timelineHomeReq.limit,
          pagingRaw
        );
        postsToReturn.push(...postsFromRedis);

        if(redisPagingRaw) {
          potentialPagingRaw = redisPagingRaw; 
        } else {
          // undefined when redis cursor is finished traversing all data
          timelineHomeReq.limit = postsFromRedis.length + 1;
        }

        logger.debug(
          `loaded from redis: ${postsFromRedis.length}`
        );
      }

      if (postsToReturn.length < timelineHomeReq.limit) {
        // user scrolled a lot! now we will need to load partially or fully from database.

        // need to call i-follow user posts
        const [postsFromPostService, postServicePagingRaw] =
          await getFromPostService(
            postsToReturn,
            userId,
            timelineHomeReq.limit,
            pagingRaw
          );

        postsToReturn.push(...postsFromPostService);
        potentialPagingRaw = postServicePagingRaw;

        logger.debug(
          `loaded from post service/mongodb: ${postsFromPostService.length}`
        );
      }

      let pageTokenObj: TimelineHomePaging | undefined;
      if (potentialPagingRaw) {
        const pagingJsonString = JSON.stringify(potentialPagingRaw);
        const nextPageToken = Buffer.from(pagingJsonString).toString("base64");
        pageTokenObj = new TimelineHomePaging(nextPageToken);
      }

      res.status(200).json(new TimelineHomeRes(postsToReturn, pageTokenObj));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /new-post: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /new-post: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};

async function getFromRedis(
  redisClient: RedisClientType<any, any, any>,
  userId: string,
  limit: number,
  pagingRaw?: TimelineHomePagingRaw
): Promise<[TimelineHomePost[], TimelineHomePagingRaw | undefined]> {
  const redisKey = `timeline-userId:${userId}`;

  let redisLastTime: string | undefined = undefined;
  if (pagingRaw) {
    redisLastTime = pagingRaw.id;
  }

  const postsToReturn: TimelineHomePost[] = [];
  const redisResult: any[] = [];
  if (!redisLastTime) {
    // first call
    // calling one more extra to see if there is at least 1 post that has the same postTime which will not be covered in the limit!
    // https://redis.io/docs/latest/commands/zrange/
    const redisRangeReply = await redisClient.zRangeWithScores(
      redisKey,
      0,
      limit,
      { REV: true }
    );
    logger.debug(`loaded from redis when first call: ${redisRangeReply.length}`);
    redisResult.push(...redisRangeReply);
  } else {
    const redisRangeReply = await redisClient.zRangeWithScores(
      redisKey,
      redisLastTime,
      "-inf",
      { REV: true, BY: "SCORE", LIMIT: { offset: 0, count: limit + 1 } }
    );
    logger.debug(`loaded from redis when pagination: ${redisRangeReply.length}`);
    redisResult.push(...redisRangeReply);
  }

  let isRedisFinished = false;
  
  //as limit cannot be 0, redisResult.length will always be more than 1 (if there is >1 data in redis itself). 
  if (
    redisResult.length === limit + 1
  ) {
    if (
      redisResult[redisResult.length - 2].score ===
      redisResult[redisResult.length - 1].score
    ) {
      // a not too common case to happen
      // oops! there are at least one redis post with same postTime which will not be covered in the limit!
      // so adding until we get a subset of list that has diff score
      logger.info(`Posts with same time found! redisKey: ${redisKey}`);
      const sameScore = redisResult[redisResult.length - 1].score;
      const maxIterationLimit = 1000;
      const chunkSize = 5;
      let startIdx = limit + 2;
      for (let i = 0; i < maxIterationLimit; i++) {
        const redisRangeReplyWithSameScore = await redisClient.zRangeWithScores(
          redisKey,
          startIdx,
          chunkSize,
          { REV: true }
        );
        if (redisRangeReplyWithSameScore.length == 0) {
          // no more chunk found in redis
          isRedisFinished = true;
          break;
        }
        if (
          redisRangeReplyWithSameScore[redisRangeReplyWithSameScore.length - 1]
            .score === sameScore
        ) {
          // a very rare case, this chunk is still full of same score
          redisResult.push(...redisRangeReplyWithSameScore);
          logger.warn(
            `A full chunk of posts with same time found! redisKey: ${redisKey}`
          );
        } else {
          for (const [i, redisData] of redisRangeReplyWithSameScore.entries()) {
            if (redisData.score === sameScore) {
              redisResult.push(redisData);
            } else {
              break;
            }
          }
        }
        startIdx = startIdx + chunkSize + 1;
      }
    } else {
      redisResult.pop();
    }
  } else {
    isRedisFinished = true;
  }

  redisResult.forEach((redisData) => {
    postsToReturn.push(new TimelineHomePost(redisData.value, redisData.score));
  });

  let pagingObj: TimelineHomePagingRaw | undefined = undefined;
  if (!isRedisFinished) {
    pagingObj = new TimelineHomePagingRaw("r", String(postsToReturn[postsToReturn.length-1].time-1));
  }

  return [postsToReturn, pagingObj];
}

async function getFromPostService(
  redisPosts: TimelineHomePost[],
  userId: string,
  limit: number,
  pagingRaw?: TimelineHomePagingRaw
): Promise<[TimelineHomePost[], TimelineHomePagingRaw | undefined]> {
  const iFollowReq = new FollowersReqInternal(userId);
  const iFollowAxiosRes = await axios.post(
    getInternalFullPath(iFollowUrl),
    iFollowReq
  );
  const iFollowIdsObj = plainToInstance(FollowersRes, iFollowAxiosRes.data);

  // need to call post service
  let pagingInfoForPostService: PostByUserPagingRaw | undefined = undefined;
  let nextPageTokenForPostService: string | undefined = undefined;

  if (redisPosts.length > 0) {
    // if redis loaded all before finishing the limit, generating post service page token based on redis data
    const lastRedisPost = redisPosts[redisPosts.length - 1];
    pagingInfoForPostService = new PostByUserPagingRaw(
      lastRedisPost.time,
      lastRedisPost.postId
    );
  } else if (pagingRaw?.type == "m" && pagingRaw?.id) {
    //requested with 'm' means, timeline data request now maps directly to post service request
    //so, using directly next page token of post service
    nextPageTokenForPostService = pagingRaw.id;
  } //else load from post service even for the first non-paginated call, means nextPageTokenForPostService = undefined

  const morePostToLoad = limit - redisPosts.length;
  const postByUserReq = new GetPostByUserReq(iFollowIdsObj.userIds, false, {
    pagingInfo: pagingInfoForPostService,
    nextToken: nextPageTokenForPostService,
    limit: morePostToLoad,
    returnOnlyPostId: true,
  });

  const postByUserAxiosRes = await axios.post(
    getInternalFullPath(getPostByUserUrl),
    postByUserReq
  );
  const postDetailsResObj = plainToInstance(
    PostDetailsRes,
    postByUserAxiosRes.data
  );
  const timelinePosts: TimelineHomePost[] = [];
  for (const post of postDetailsResObj.posts) {
    timelinePosts.push(new TimelineHomePost(post.postId, post.time));
  }

  let pagingObj: TimelineHomePagingRaw | undefined;
  if (postDetailsResObj.paging?.nextToken) {
    const pageLastPostIdStr = postDetailsResObj.paging?.nextToken;
    pagingObj = new TimelineHomePagingRaw("m", pageLastPostIdStr);
  }

  return [timelinePosts, pagingObj];
}
