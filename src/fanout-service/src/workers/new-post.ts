import * as log4js from "log4js";

import { RedisClientType } from 'redis'

const logger = log4js.getLogger();
logger.level = "trace";

export const newPostFanout = async (redisClient: RedisClientType<any, any, any>, messageStr: string) => {
    const message = JSON.parse(messageStr);

    if (message.postTime && message.postId) {
        await redisClient.zAdd(message.userId, {
            score: message.postTime,
            value: message.postId
        });
        logger.trace(`Saved to redis: ${messageStr}`);
    } else {
        logger.warn(`No postTime and/or postId: ${messageStr}`);
    }
} 