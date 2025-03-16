import {
  GetPostByUserReq,
  IFollowedKafkaMsg,
  InvalidRequest,
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

const maxPostSetSize: number =
  Number(process.env.KAFKA_MAX_POST_SET_SIZE) || 100;
const getPostByUserUrl: string =
  process.env.GET_POST_BY_USER_URL ||
  "http://127.0.0.1:5005/v1/post/get-by-user/";

export const iFollowedFanout = async (
  redisClient: RedisClientType<any, any, any>,
  messageStr: string,
): Promise<boolean> => {
  try {
    logger.debug(`iFollowedFanout has started with message: ${messageStr}`);

    const iFollowedKafkaMsg = plainToInstance(
      IFollowedKafkaMsg,
      JSON.parse(messageStr),
    );
    const errors = await validate(iFollowedKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`);
      return true;
    }

    const redisKey = `timeline-userId:${iFollowedKafkaMsg.userId}`;
    const leastRecentPosts = await redisClient.zRangeWithScores(redisKey, 0, 0);

    var endTime: number = 0;

    if (leastRecentPosts.length === 0) {
      logger.debug(`${redisKey} is empty in redis`);
    } else {
      endTime = leastRecentPosts[0].score;
    }

    logger.debug(`end time is: ${endTime}`);
    const postByUserReq = new GetPostByUserReq(
      [iFollowedKafkaMsg.followsUserId],
      false,
      { returnOnlyPostId: true, limit: maxPostSetSize },
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
      `Received ${postDetailsResObj.posts.length} posts from post service for userId: ${iFollowedKafkaMsg.followsUserId}`,
    );

    // postDetailsResObj.posts is descending sorted
    let postCount = 0;
    for (const post of postDetailsResObj.posts) {
      if (post.time < endTime) {
        break;
      }
      postCount += await redisClient.zAdd(redisKey, {
        score: post.time,
        value: post.postId,
      });
    }

    if(postDetailsResObj.posts.length - postCount >= 1) {
      logger.warn(
        `failed to post to redis key of ${redisKey}: ${postDetailsResObj.posts.length - postCount}`,
      );
    }


    workerOperationCount
      .labels(iFollowedFanout.name, "new_post_loaded_to_redis")
      .inc(postDetailsResObj.posts.length);

    const setSize = await redisClient.zCard(redisKey);
    if (setSize > maxPostSetSize) {
      const toRemove = setSize - maxPostSetSize - 1;
      const postRemCount = await redisClient.zRemRangeByRank(redisKey, 0, toRemove);
      logger.debug(
        `${redisKey} had ${setSize} posts, removed ${postRemCount} least recent posts`,
      );
      workerOperationCount
        .labels(iFollowedFanout.name, "old_post_removed_from_redis")
        .inc(toRemove);
    }

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while i-follow worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
      );
    } else {
      logger.error("Error while i-follow worker: ", error);
    }
  }
  return false;
};
