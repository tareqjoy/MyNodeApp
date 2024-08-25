import { GetPostByUserReq, InvalidRequest, IUnfollowedKafkaMsg, PostDetailsRes } from "@tareqjoy/models";
import axios from "axios";
import * as log4js from "log4js";
import { RedisClientType } from 'redis'
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const logger = log4js.getLogger();
logger.level = "trace";

const getPostByUserUrl: string = process.env.GET_POST_BY_USER_URL || "http://127.0.0.1:5005/v1/post/get-by-user/";

export const iUnfollowedFanout = async (redisClient: RedisClientType<any, any, any>, messageStr: string): Promise<boolean> => {
    try {
        logger.trace(`iUnfollowedFanout has started with message: ${messageStr}`);

        const iUnfollowedKafkaMsg = plainToInstance(IUnfollowedKafkaMsg, JSON.parse(messageStr));
        const errors = await validate(iUnfollowedKafkaMsg);

        if (errors.length > 0) {
            logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`)
            return true;
        }

        const redisKey = `timeline-userId:${iUnfollowedKafkaMsg.userId}`;
        const leastRecentPosts = await redisClient.zRangeWithScores(redisKey, 0, 0);

        var endTime: number | undefined = undefined;

        if (leastRecentPosts.length === 0) {
            logger.trace(`${redisKey} is empty in redis`);
        } else {
            endTime = leastRecentPosts[0].score;
        }

        const postByUserReq = new GetPostByUserReq([iUnfollowedKafkaMsg.unfollowsUserId], false, {endTime: endTime, returnOnlyPostId: true});
        const postByUserAxiosRes = await axios.post(getPostByUserUrl, postByUserReq);
        const postDetailsResObj = plainToInstance(PostDetailsRes, postByUserAxiosRes.data);

        logger.trace(`Received from ${postDetailsResObj.posts.length} posts from post service for userId: ${iUnfollowedKafkaMsg.unfollowsUserId}`);

        var removedPostCount = 0;
        for(const post of postDetailsResObj.posts) {
            if (await redisClient.zRem(redisKey, post.postId)) {
                removedPostCount++;
            }
        }

        logger.trace(`${removedPostCount} posts removed from redis key of ${redisKey}`);

        return true;
    } catch(error) {
        logger.error("error while fanout: ", error);
    }
    return false;
} 