import {
  FollowersReqInternal,
  FollowersRes,
  InvalidRequest,
  NewPostKafkaMsg,
} from "@tareqjoy/models";
import axios from "axios";
import { RedisClientType } from "redis";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import { getInternalFullPath } from "@tareqjoy/utils";
import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const whoFollowsMeUrl: string =
  process.env.WHO_FOLLOWS_ME_URL ||
  "http://127.0.0.1:5003/v1/follower/who-follows-me/";
const maxPostSetSize: number =
  Number(process.env.KAFKA_MAX_POST_SET_SIZE) || 100;

export const newPostFanout = async (
  redisClient: RedisClientType<any, any, any>,
  messageStr: string,
): Promise<boolean> => {
  try {
    const newPostKafkaMsg = plainToInstance(
      NewPostKafkaMsg,
      JSON.parse(messageStr),
    );
    const errors = await validate(newPostKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${JSON.stringify(errors)}`);
      return true;
    }
    const followsMeReq = new FollowersReqInternal(newPostKafkaMsg.userId);

    const whoFollowsAxiosRes = await axios.post(
      getInternalFullPath(whoFollowsMeUrl),
      followsMeReq,
    );

    const followersIdsObj = plainToInstance(
      FollowersRes,
      whoFollowsAxiosRes.data,
    );

    logger.debug(`Received from follower service: ${followersIdsObj.userIds}`);

    let totalRemovedPostCount = 0;
    for (const uid of followersIdsObj.userIds!) {
      const redisKey = `timeline-userId:${uid}`;
      //  When multiple elements have the same score, they are ordered lexicographically
      const newAddCount = await redisClient.zAdd(redisKey, {
        //zAdd: https://redis.io/docs/latest/commands/zadd/
        score: newPostKafkaMsg.postTime,
        value: newPostKafkaMsg.postId,
      });

      if(newAddCount === 0) {
        logger.warn(`post failed to add, post: ${newPostKafkaMsg.postId}, userId: ${uid}`);
      }

      const setSize = await redisClient.zCard(redisKey);
      if (setSize > maxPostSetSize) {
        const toRemove = setSize - maxPostSetSize - 1;
        totalRemovedPostCount += toRemove;
        await redisClient.zRemRangeByRank(redisKey, 0, toRemove); // zRemRangeByRank: https://redis.io/docs/latest/commands/zremrangebyrank/
        logger.debug(
          `${redisKey} had ${setSize} posts, removed ${toRemove} least recent posts`,
        );
      }

      logger.debug(`Posted to redis of ${redisKey}`);
    }

    workerOperationCount
      .labels(newPostFanout.name, "post_fanout_user_count")
      .inc(followersIdsObj.userIds!.length);
    workerOperationCount
      .labels(newPostFanout.name, "post_removed_from_redis")
      .inc(totalRemovedPostCount);

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while new-post worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
      );
    } else {
      logger.error("Error while new-post worker: ", error);
    }
  }
  return false;
};
