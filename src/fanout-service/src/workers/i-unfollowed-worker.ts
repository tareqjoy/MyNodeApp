import {
  GetPostByUserReq,
  InvalidRequest,
  IUnfollowedKafkaMsg,
  PostDetailsRes,
} from "@tareqjoy/models";
import axios from "axios";
import { RedisClientType } from "redis";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import { getInternalFullPath } from "@tareqjoy/utils";
import { getFileLogger } from "@tareqjoy/utils";

const logger =  getFileLogger(__filename);

const getPostByUserUrl: string =
  process.env.GET_POST_BY_USER_URL ||
  "http://127.0.0.1:5005/v1/post/get-by-user/";

export const iUnfollowedFanout = async (
  redisClient: RedisClientType<any, any, any>,
  messageStr: string,
): Promise<boolean> => {
  try {
    logger.debug(`iUnfollowedFanout has started with message: ${messageStr}`);

    const iUnfollowedKafkaMsg = plainToInstance(
      IUnfollowedKafkaMsg,
      JSON.parse(messageStr),
    );
    const errors = await validate(iUnfollowedKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${JSON.stringify(errors)}`);
      return true;
    }

    const redisKey = `timeline-userId:${iUnfollowedKafkaMsg.userId}`;
    const leastRecentPosts = await redisClient.zRangeWithScores(redisKey, 0, 0);

    var endTime: number = 0;

    if (leastRecentPosts.length === 0) {
      logger.debug(`${redisKey} is empty in redis`);
    } else {
      endTime = leastRecentPosts[0].score;
    }

    const postByUserReq = new GetPostByUserReq(
      [iUnfollowedKafkaMsg.unfollowsUserId],
      false,
      { returnOnlyPostId: true },
    );
    const postByUserAxiosRes = await axios.post(
      getInternalFullPath(getPostByUserUrl),
      postByUserReq,
    );
    const postDetailsResObj = plainToInstance(
      PostDetailsRes,
      postByUserAxiosRes.data,
    );

    logger.debug(
      `Received from ${postDetailsResObj.posts.length} posts from post service for userId: ${iUnfollowedKafkaMsg.unfollowsUserId}`,
    );

    var removedPostCount = 0;
    for (const post of postDetailsResObj.posts) {
      if (post.time < endTime) {
        break;
      }
      removedPostCount+=await redisClient.zRem(redisKey, post.postId);
    }

    if(postDetailsResObj.posts.length - removedPostCount >= 1) {
      logger.warn(
        `failed to remove post from redis key of ${redisKey}: ${postDetailsResObj.posts.length - removedPostCount}`,
      );
    }


    workerOperationCount
      .labels(iUnfollowedFanout.name, "post_removed_from_redis")
      .inc(removedPostCount);

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while i-unfollow worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
      );
    } else {
      logger.error("Error while i-unfollow worker: ", error);
    }
  }
  return false;
};
