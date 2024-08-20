import { FollowersReq, FollowersRes, InvalidRequest, NewPostKafkaMsg } from "@tareqjoy/models";
import axios from "axios";
import * as log4js from "log4js";
import { RedisClientType } from 'redis'
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const logger = log4js.getLogger();
logger.level = "trace";

const whoFollowsMeUrl: string = process.env.WHO_FOLLOWS_ME_URL || "http://127.0.0.1:5003/v1/follower/who-follows-me/";

export const newPostFanout = async (redisClient: RedisClientType<any, any, any>, messageStr: string): Promise<boolean> => {
    try {
        const newPostKafkaMsg = plainToInstance(NewPostKafkaMsg, JSON.parse(messageStr));
        const errors = await validate(newPostKafkaMsg);

        if (errors.length > 0) {
            logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`)
            return true;
        }
        const followsMeReq = new FollowersReq(newPostKafkaMsg.userId, false, false);
        
        const whoFollowsAxiosRes = await axios.post(whoFollowsMeUrl, followsMeReq);

        const followersIdsObj = plainToInstance(FollowersRes, whoFollowsAxiosRes.data);

        logger.trace(`Received from follower service: ${followersIdsObj.userIds}`);

        for(const uid of followersIdsObj.userIds!) {
            const redisKey = `timeline-userId:${uid}`;
            await redisClient.zAdd(redisKey, {
                score: newPostKafkaMsg.postTime,
                value: newPostKafkaMsg.postId
            });
            logger.trace(`Posted to redis of ${redisKey}`);
        }

        return true;
    } catch(error) {
        logger.error("error while fanout: ", error);
    }
    return false;
} 