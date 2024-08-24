import express from 'express'
import * as log4js from "log4js";
import { RedisClientType } from 'redis';
import axios from 'axios';
import { FollowersReq, FollowersRes, GetPostByUserReq, GetPostReq, InvalidRequest, PostDetailsRes, SinglePost, TimelineHomeReq, TimelineHomeRes, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";
const iFollowUrl: string = process.env.I_FOLLOW_URL || "http://127.0.0.1:5003/v1/follower/i-follow/";
const getPostByPostIdUrl: string = process.env.GET_POST_BY_POST_ID_URL || "http://127.0.0.1:5005/v1/post/get/";
const getPostByUserUrl: string = process.env.GET_POST_BY_USER_URL || "http://127.0.0.1:5005/v1/post/get-by-user/";

const router = express.Router();

const POST_RETURN_LIMIT = 10;

export const createTimelineRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/home', async (req, res, next) => {
        logger.trace(`POST /home called`);

        const timelineHomeReq = plainToInstance(TimelineHomeReq, req.body);
        const errors = await validate(timelineHomeReq);

        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            const userInternalReq = new UserInternalReq(timelineHomeReq.username, true);
            const userIdResponse = await axios.post(userServiceHostUrl, userInternalReq);
    
            const userInternalResponse = plainToInstance(UserInternalRes, userIdResponse.data);
    
            if (!userInternalResponse.toUserIds || !userInternalResponse.toUserIds[timelineHomeReq.username]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }
        

            const userId = userInternalResponse.toUserIds[timelineHomeReq.username];
            
            const redisKey = `timeline-userId:${userId}`;
            const redisResults = await redisClient.zRangeByScoreWithScores(redisKey, '-inf', timelineHomeReq.startTime || '+inf', { 
                    LIMIT: {
                        offset: 0,
                        count: POST_RETURN_LIMIT,
                    }
                }
            );

            const redisPostIds = redisResults.reverse().map(item => item.value);

            const postsToReturn: SinglePost[] = [];
            logger.trace("loaded from redis: ", redisPostIds.length);

            if (redisPostIds.length > 0) {
                const postByPostIdReq = new GetPostReq(redisPostIds, timelineHomeReq.returnAsUsername);
                const postByPostIdAxiosRes = await axios.post(getPostByPostIdUrl, postByPostIdReq);
                const postDetailsResObj = plainToInstance(PostDetailsRes, postByPostIdAxiosRes.data);

                for(const post of postDetailsResObj.posts) {
                    postsToReturn.push(post);
                }
            }

            const morePostToLoad = POST_RETURN_LIMIT - postsToReturn.length;

            if (morePostToLoad > 0) {
                const lastPostTime = postsToReturn.length == 0? (timelineHomeReq.startTime || Date.now()): postsToReturn[postsToReturn.length - 1].time;

                const iFollowReq = new FollowersReq(userId, false, false);
                const iFollowAxiosRes = await axios.post(iFollowUrl, iFollowReq);
                const iFollowIdsObj = plainToInstance(FollowersRes, iFollowAxiosRes.data);

                const postByUserReq = new GetPostByUserReq(iFollowIdsObj.userIds, false, {startTime: lastPostTime, limit: morePostToLoad, returnAsUsername: timelineHomeReq.returnAsUsername});
                const postByUserAxiosRes = await axios.post(getPostByUserUrl, postByUserReq);
                const postDetailsResObj = plainToInstance(PostDetailsRes, postByUserAxiosRes.data);

                for(const post of postDetailsResObj.posts) {
                    postsToReturn.push(post);
                }
            }

            res.status(200).json(new TimelineHomeRes(postsToReturn));
        } catch(error) {
            logger.error("Error while get: ", error);
            res.status(500).json({error: error});
        }
    
    });

    return router;
}
