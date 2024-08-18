import axios from "axios";
import * as log4js from "log4js";

import { RedisClientType } from 'redis'

const logger = log4js.getLogger();
logger.level = "trace";

const followerServiceHostUrl: string = process.env.FOLLOWER_SERVICE_USERID_URL || "http://127.0.0.1:5003/v1/follower/who-follows/";

export const newPostFanout = async (redisClient: RedisClientType<any, any, any>, messageStr: string) => {
    try {
        const message = JSON.parse(messageStr);

        if (message.postTime && message.postId) {
            const whoFollowsBody = {
                userId: message.userId,
                returnAsUsername: false
            };
            const whoFollowsResponse = await axios.post(followerServiceHostUrl, whoFollowsBody);
            logger.warn(whoFollowsBody);
            logger.warn(whoFollowsResponse.data);

            for(const uid of whoFollowsResponse.data) {
                logger.warn(uid);
                const redisKey = `timeline-userId:${uid}`;
                await redisClient.zAdd(redisKey, {
                    score: message.postTime,
                    value: message.postId
                });
                logger.trace(`Posted to redis of ${redisKey}: ${messageStr}`);
            }
        } else {
            logger.warn(`No postTime and/or postId: ${messageStr}`);
        }
    } catch(error) {
        logger.error("error while fanout: ", error);
    }

} 