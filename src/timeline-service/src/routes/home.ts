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
const loadFromPostService: string =
  process.env.LOAD_FROM_POST_SERVICE ||
  "load";

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

        if (redisPagingRaw) {
          potentialPagingRaw = redisPagingRaw;
        } else {
          // undefined when redis cursor is finished traversing all data
          timelineHomeReq.limit = Math.max(postsFromRedis.length + 1, timelineHomeReq.limit);
        }

        logger.debug(`loaded from redis: ${postsFromRedis.length}`);
      }

      if (loadFromPostService === "load" && postsToReturn.length < timelineHomeReq.limit) {
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
      logger.debug(`returning results: ${postsToReturn.length}`);
      res.status(200).json(new TimelineHomeRes(postsToReturn, pageTokenObj));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /new-post: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
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

  let redisPostStartTime: string = "+inf";
  if (pagingRaw) {
    redisPostStartTime = `${Number(pagingRaw.id)-1}`;
  }

  const postsToReturn: TimelineHomePost[] = [];
  const redisResult: any[] = [];

  // first call
  // calling one more extra to see if there is at least 1 post that has the same postTime which will not be covered in the limit!
  // https://redis.io/docs/latest/commands/zrange/

  const redisRangeReply = await redisClient.zRangeWithScores(
    redisKey,
    redisPostStartTime,
    "-inf",
    { REV: true, BY: "SCORE", LIMIT: { offset: 0, count: limit + 1 } }
  );
  logger.debug(`loaded from redis when pagination: ${redisRangeReply.length}`);
  redisResult.push(...redisRangeReply);

  let isRedisFinished = false;

  //as limit cannot be 0, redisResult.length will always be more than 1 (if there is >1 data in redis itself).
  if (redisResult.length === limit + 1) {
    if (
      redisResult[redisResult.length - 2].score ===
      redisResult[redisResult.length - 1].score
    ) {
      // a not too common case to happen
      // oops! there are at least one redis post with same postTime which will not be covered in the limit!
      // so adding until we get a subset of list that has diff score
      logger.info(`Posts with same time found! redisKey: ${redisKey}`);
      const sameScore = redisResult[redisResult.length - 1].score;

      const postIdSet = new Set(redisRangeReply.map((item) => item.value));
      // https://redis.io/docs/latest/commands/zrangebyscore/
      const redisSameScoreReply = await redisClient.zRangeByScore(
        redisKey,
        sameScore,
        sameScore
      );
      logger.info(`Posts with same time count: ${redisSameScoreReply.length}`);
      // zRangeByScore returns by ascending sorted but zRangeWithScores (REV=true) returns by descending
      const descendingSortedRedisReply = redisSameScoreReply.reverse();

      for (const [i, value] of descendingSortedRedisReply.entries()) {
        if (!postIdSet.has(value)) {
          redisResult.push({ value: value, score: sameScore });
        }
      }

      if(loadFromPostService === "load") {
        const redisZTotalCount = await redisClient.zCard(redisKey);
        isRedisFinished = redisZTotalCount === redisResult.length;
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
    pagingObj = new TimelineHomePagingRaw(
      "r",
      String(postsToReturn[postsToReturn.length - 1].time)
    );
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
  logger.debug(`more post to load from post service: limit: ${limit}, toload: ${morePostToLoad}`)
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
