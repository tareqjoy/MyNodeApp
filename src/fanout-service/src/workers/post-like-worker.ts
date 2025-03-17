import {
  InvalidRequest,
  LikeReq,
  Post,
  PostLike,
  PostLikeKafkaMsg,
  UnlikeReq,
} from "@tareqjoy/models";
import axios from "axios";
import { RedisClientType } from "redis";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import {
  fillString,
  getFileLogger,
  REDIS_KEY_POST_LIKE_COUNT,
} from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";

const logger = getFileLogger(__filename);

export const postLikeWorker = async (
  redisClient: RedisClientType<any, any, any>,
  mongoClient: Mongoose,
  messageStr: string
): Promise<boolean> => {
  try {
    const postLikeKafkaMsg = plainToInstance(
      PostLikeKafkaMsg,
      JSON.parse(messageStr)
    );
    const errors = await validate(postLikeKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`);
      return true;
    }

    if (postLikeKafkaMsg.type === "like") {
      const postLikeMsg = postLikeKafkaMsg.messageObject as LikeReq;

      const existingLikeInMongo = await PostLike.findOne({
        userId: postLikeKafkaMsg.userId,
        postId: postLikeMsg.postId,
      });

      if (existingLikeInMongo) {
        if (existingLikeInMongo.likeType !== postLikeMsg.reactType) {
          existingLikeInMongo.likeType = postLikeMsg.reactType;
          existingLikeInMongo.createdAt = postLikeMsg.reactTime;
          await existingLikeInMongo.save();

          await updateRedisPostUnlike(
            redisClient,
            postLikeMsg.postId,
            existingLikeInMongo.likeType
          );
          await updateRedisPostLike(redisClient, postLikeMsg);

          workerOperationCount
            .labels(postLikeWorker.name, "like_type_change")
            .inc(1);
        } else {
          logger.debug(
            `Mongo: Trying to do an existent like, skipping. userId:${postLikeKafkaMsg.userId}, postId: ${postLikeMsg.postId}, reactType: ${postLikeMsg.reactType}`
          );
        }
      } else {
        // add to post-user like relationship
        const postLikeObj = new PostLike({
          userId: postLikeKafkaMsg.userId,
          postId: postLikeMsg.postId,
          likeType: postLikeMsg.reactType,
          createdAt: postLikeMsg.reactTime,
        });
        const dbResult = await postLikeObj.save();
        logger.debug(`Mongo: saved to mongodb with postId: ${dbResult.id}`);

        await updateRedisPostLike(redisClient, postLikeMsg);

        workerOperationCount.labels(postLikeWorker.name, "like_count").inc(1);
      }

      return true;
    } else if (postLikeKafkaMsg.type === "unlike") {
      const postUnlikeMsg = postLikeKafkaMsg.messageObject as UnlikeReq;

      const existingLikeInMongo = await PostLike.findOne({
        userId: postLikeKafkaMsg.userId,
        postId: postUnlikeMsg.postId,
      });

      if (existingLikeInMongo) {
        const deleteResult = await PostLike.deleteOne({
          userId: postLikeKafkaMsg.userId,
          postId: postUnlikeMsg.postId,
        });

        if (deleteResult.deletedCount === 0) {
          logger.warn(
            `Mongo: Failed to remove existent like. userId:${postLikeKafkaMsg.userId}, postId: ${postUnlikeMsg.postId}`
          );
        } else {
          await updateRedisPostUnlike(
            redisClient,
            postUnlikeMsg.postId,
            existingLikeInMongo.likeType
          );
        }
        workerOperationCount.labels(postLikeWorker.name, "unlike_count").inc(1);
      } else {
        logger.debug(
          `Mongo: Trying to do remove non existent like, skipping. userId:${postLikeKafkaMsg.userId}, postId: ${postUnlikeMsg.postId}`
        );
      }
      
      return true;
    }

    return false;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while new-post worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
      );
    } else {
      logger.error("Error while new-post worker: ", error);
    }
  }
  return false;
};

// Reusable function to handle updating reactions in a post
async function updateRedisPostLike(
  redisClient: RedisClientType<any, any, any>,
  postLikeMsg: LikeReq
): Promise<void> {
  try {
    const postRedisKey = fillString(REDIS_KEY_POST_LIKE_COUNT, {
      postId: postLikeMsg.postId,
    });

    const existInRedis = await redisClient.exists(postRedisKey);
    if (existInRedis === 0) {
      logger.info(
        `Redis: trying to like on non existent post in redis, skipping, redisKey: ${postRedisKey}`
      );
      /*
      const reactionCounts = await PostLike.aggregate([
        {
          $group: {
            _id: "$likeType",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            reactionType: "$_id",
            count: 1,
          },
        },
      ]);

      for (const reaction of reactionCounts) {
        const loadedIntoRedis = await redisClient.hIncrBy(
          postRedisKey,
          reaction.likeType,
          reaction.count
        );
        if (loadedIntoRedis === 0) {
          logger.warn(
            `failed to add reaction into redis, redisKey: ${postRedisKey}, reaction: ${reaction.likeType}:${reaction.count}`
          );
        }
      }*/
    } else {
      logger.debug(
        `Redis: post reaction found in Redis, updating redis reaction count, redisKey: ${postRedisKey}`
      );

      const loadedIntoRedis = await redisClient.hIncrBy(
        postRedisKey,
        postLikeMsg.reactType,
        1
      );
      if (loadedIntoRedis === 0) {
        logger.warn(
          `Redis: failed to update reaction into redis, redisKey: ${postRedisKey}, reaction: ${postLikeMsg.reactType}:1`
        );
      }
    }
  } catch (error) {
    // Handle the error (log it or rethrow)
    logger.error("Error updating post reactions add:", error);
    throw error; // Optionally throw the error for higher-level handling
  }
}

async function updateRedisPostUnlike(
  redisClient: RedisClientType<any, any, any>,
  postId: string,
  reactType: string
): Promise<void> {
  try {
    const postRedisKey = fillString(REDIS_KEY_POST_LIKE_COUNT, {
      postId: postId,
    });

    const existInRedis = await redisClient.exists(postRedisKey);
    if (existInRedis === 0) {
      logger.info(
        `Redis: trying to unlike non existent post in redis, skipping, redisKey: ${postRedisKey}`
      );
    } else {
      logger.debug(
        `Redis: post reaction found in Redis, updating redis reaction count, redisKey: ${postRedisKey}`
      );

      const loadedIntoRedis = await redisClient.hIncrBy(
        postRedisKey,
        reactType,
        -1
      );
      if (loadedIntoRedis === 0) {
        logger.warn(
          `Redis: failed to decrement reaction into redis, redisKey: ${postRedisKey}, reaction: ${reactType}`
        );
      }
    }
  } catch (error) {
    // Handle the error (log it or rethrow)
    logger.error("Error updating post reactions add:", error);
    throw error; // Optionally throw the error for higher-level handling
  }
}
