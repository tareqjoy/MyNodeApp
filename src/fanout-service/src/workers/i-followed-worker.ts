import { GetPostByUserReq, IFollowedKafkaMsg, InvalidRequest, PostDetailsRes } from "@tareqjoy/models";
import axios from "axios";
import * as log4js from "log4js";
import { RedisClientType } from 'redis'
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";

const logger = log4js.getLogger();
logger.level = "trace";

const maxPostSetSize: number = Number(process.env.KAFKA_MAX_POST_SET_SIZE) || 100;
const getPostByUserUrl: string = process.env.GET_POST_BY_USER_URL || "http://127.0.0.1:5005/v1/post/get-by-user/";

export const iFollowedFanout = async (redisClient: RedisClientType<any, any, any>, messageStr: string): Promise<boolean> => {
    try {
        logger.trace(`iFollowedFanout has started with message: ${messageStr}`);

        const iFollowedKafkaMsg = plainToInstance(IFollowedKafkaMsg, JSON.parse(messageStr));
        const errors = await validate(iFollowedKafkaMsg);

        if (errors.length > 0) {
            logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`)
            return true;
        }

        const redisKey = `timeline-userId:${iFollowedKafkaMsg.userId}`;
        const leastRecentPosts = await redisClient.zRangeWithScores(redisKey, 0, 0);

        var endTime: number = Date.now();

        if (leastRecentPosts.length === 0) {
            logger.trace(`${redisKey} is empty in redis`);
        } else {
            endTime = leastRecentPosts[0].score;
        }

        const postByUserReq = new GetPostByUserReq([iFollowedKafkaMsg.followsUserId], false, {returnOnlyPostId: true, limit: maxPostSetSize});
        const postByUserAxiosRes = await axios.post(getPostByUserUrl, postByUserReq);
        const postDetailsResObj = plainToInstance(PostDetailsRes, postByUserAxiosRes.data);

        logger.trace(`Received from ${postDetailsResObj.posts.length} posts from post service for userId: ${iFollowedKafkaMsg.followsUserId}`);

        for(const post of postDetailsResObj.posts) {
            if (post.time > endTime) {
                break;
            }
            await redisClient.zAdd(redisKey, {
                score: post.time,
                value: post.postId
            });
        }

        logger.trace(`${postDetailsResObj.posts.length} posts posted to redis key of ${redisKey}`);

        workerOperationCount.labels(iFollowedFanout.name, 'new_post_loaded_to_redis').inc(postDetailsResObj.posts.length);

        const setSize = await redisClient.zCard(redisKey);
        if (setSize > maxPostSetSize) {
            const toRemove =  setSize - maxPostSetSize -1;
            await redisClient.zRemRangeByRank(redisKey, 0, toRemove);
            logger.trace(`${redisKey} had ${setSize} posts, removed ${toRemove} least recent posts`);
            workerOperationCount.labels(iFollowedFanout.name, 'old_post_removed_from_redis').inc(toRemove);
        }

        return true;
    } catch(error) {
        if (axios.isAxiosError(error)) {
            logger.error(`Error while i-follow: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`);
        } else {
            logger.error("Error while i-follow: ", error);
        }
    }
    return false;
} 