import {
  InvalidRequest,
  LikeReq,
  PostLikeKafkaMsg,
  UnlikeReq,
} from "@tareqjoy/models";
import { Post, PostLike } from "@tareqjoy/clients";
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
  redisClient: RedisClientType<any, any, any, any>,
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
      logger.warn(`Bad data found from Kafka: ${JSON.stringify(errors)}`);
      return true;
    }

    if (postLikeKafkaMsg.type === "like") {
      const postLikeMsg = postLikeKafkaMsg.messageObject as LikeReq;

      const filter = {
        userId: postLikeKafkaMsg.userId,
        postId: postLikeMsg.postId,
      };
      const update = {
        $set: {
          likeType: postLikeMsg.reactType,
          createdAt: postLikeMsg.reactTime,
        },
      };
      // Use findOneAndUpdate for atomic operation: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
      const existingLikeInMongo = await PostLike.findOneAndUpdate(
        filter,
        update,
        {
          upsert: true, // If it doesn’t exist, create a new one
          returnDocument: "before",
        }
      );

      if (
        existingLikeInMongo &&
        existingLikeInMongo.likeType === postLikeMsg.reactType
      ) {
        logger.debug(
          `already liked with the same reaction, userId:${existingLikeInMongo.userId}, ${existingLikeInMongo.likeType}`
        );
      } else {
        if (existingLikeInMongo) {
          const isSuccess = await updateRedisPostLike(redisClient,postLikeMsg.postId, existingLikeInMongo.likeType, postLikeMsg.reactType);
          if(isSuccess) {
            logger.debug(
              `like updated, postId:${existingLikeInMongo.postId}, userId:${existingLikeInMongo.userId}, old like: ${existingLikeInMongo.likeType}, new like: ${postLikeMsg.reactType}`
            );
          } else {
            logger.warn(
              `like update failed, postId:${existingLikeInMongo.postId}, userId:${existingLikeInMongo.userId}, old like: ${existingLikeInMongo.likeType}, new like: ${postLikeMsg.reactType}`
            );
          }

        } else {
          await incRedisPostLike(
            redisClient,
            postLikeMsg.postId,
            postLikeMsg.reactType
          );
          logger.debug(
            `new liked updated:${postLikeMsg.postId}, userId:${postLikeKafkaMsg.userId}, like: ${postLikeMsg.reactType}`
          );
        }

        workerOperationCount.labels(postLikeWorker.name, "like_count").inc(1);
      }

      return true;
    } else if (postLikeKafkaMsg.type === "unlike") {
      const postUnlikeMsg = postLikeKafkaMsg.messageObject as UnlikeReq;

      const existingLikeInMongo = await PostLike.findOneAndDelete({
        userId: postLikeKafkaMsg.userId,
        postId: postUnlikeMsg.postId,
      });

      if (existingLikeInMongo) {
        await decRedisPostLike(
          redisClient,
          postUnlikeMsg.postId,
          existingLikeInMongo.likeType
        );
        logger.debug(
          `unliked, postId:${existingLikeInMongo.postId}, userId:${existingLikeInMongo.userId}, like: ${existingLikeInMongo.likeType}`
        );
        workerOperationCount.labels(postLikeWorker.name, "unlike_count").inc(1);
      } else {
        logger.debug(`already unliked, userId:${postLikeKafkaMsg.userId}`);
      }

      return true;
    }

    return false;
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

async function updateRedisPostLike(
  redisClient: RedisClientType<any, any, any>,
  postId: string,
  oldReactType: string,
  newReactType: string
): Promise<boolean> {
  const maxRetries = 3; // Maximum number of retries
  let retryCount = 0;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (retryCount <= maxRetries) {
    try {
      const postRedisKey = fillString(REDIS_KEY_POST_LIKE_COUNT, {
        postId: postId,
      });

      const transaction = redisClient.multi();
      transaction.hIncrBy(postRedisKey, oldReactType, -1);
      transaction.hIncrBy(postRedisKey, newReactType, 1);

      const results = await transaction.exec();

      if (results === null) {
        // Handle case where the transaction failed (the key was modified during the transaction)
        logger.warn("Transaction failed due to changes in the key.");
        
        // Increment retry count and apply exponential backoff
        retryCount++;
        const backoffTime = Math.pow(2, retryCount) * 100; // Exponential backoff (e.g., 100ms, 200ms, 400ms)
        logger.debug(`Retrying transaction. Attempt #${retryCount} after ${backoffTime}ms...`);
        
        // Wait before retrying
        await delay(backoffTime);
      } else {
        // If the transaction is successful
        logger.debug("Transaction successful", results);
        return true; // Exit the loop and function after a successful transaction
      }
    } catch (error) {
      // If an error occurs (e.g., Redis failure), log it
      logger.error("Error updating post reactions add:", error);

      // Handle retry limit exceeded (if needed, throw an error or handle gracefully)
      retryCount++;
      if (retryCount > maxRetries) {
        logger.error("Max retries reached. Could not complete transaction.");
        throw error; // Optionally, throw the error to propagate failure
      }

      // Apply exponential backoff
      const backoffTime = Math.pow(2, retryCount) * 100; // Exponential backoff
      logger.debug(`Retrying after ${backoffTime}ms...`);
      await delay(backoffTime);
    }
  }
  return false;
}


async function incRedisPostLike(
  redisClient: RedisClientType<any, any, any>,
  postId: string,
  reactType: string
): Promise<void> {
  try {
    const postRedisKey = fillString(REDIS_KEY_POST_LIKE_COUNT, {
      postId: postId,
    });

    const loadedIntoRedis = await redisClient.hIncrBy(
      postRedisKey,
      reactType,
      1
    );
    if (loadedIntoRedis === 0) {
      logger.warn(
        `Redis: failed to update reaction into redis, redisKey: ${postRedisKey}, reaction: ${reactType}:1`
      );
    }
  } catch (error) {
    // Handle the error (log it or rethrow)
    logger.error("Error updating post reactions add:", error);
    throw error; // Optionally throw the error for higher-level handling
  }
}

async function decRedisPostLike(
  redisClient: RedisClientType<any, any, any>,
  postId: string,
  reactType: string
): Promise<void> {
  try {
    const postRedisKey = fillString(REDIS_KEY_POST_LIKE_COUNT, {
      postId: postId,
    });

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
  } catch (error) {
    // Handle the error (log it or rethrow)
    logger.error("Error updating post reactions add:", error);
    throw error; // Optionally throw the error for higher-level handling
  }
}
