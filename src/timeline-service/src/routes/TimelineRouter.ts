import express from 'express'
import * as log4js from "log4js";
import { RedisClientType } from 'redis';
import axios, { options } from 'axios';
import { FollowersReq, FollowersRes, GetPostByUserReq, GetPostReq, InvalidRequest, Paging, PostDetailsRes, SinglePost, TimelineHomeReq, TimelineHomeRes, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";
const iFollowUrl: string = process.env.I_FOLLOW_URL || "http://127.0.0.1:5003/v1/follower/i-follow/";
const getPostByPostIdUrl: string = process.env.GET_POST_BY_POST_ID_URL || "http://127.0.0.1:5005/v1/post/get/";
const getPostByUserUrl: string = process.env.GET_POST_BY_USER_URL || "http://127.0.0.1:5005/v1/post/get-by-user/";

const router = express.Router();

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

            const redisResults = await redisClient.sendCommand(
                ['ZRANGE', redisKey, String(timelineHomeReq.highTime), '-inf', 'BYSCORE', 'REV', 'LIMIT', '0', String(timelineHomeReq.limit), 'WITHSCORES']
            );
            
            // TODO: Handle paging by token
            // { roffset: 5} <- from redis or {mtime: 5, mid: dsdasd} <- from mongodb
            const postIdTimeStrList = redisResults as string[];

            const postIdTime = postIdTimeStrList.reduce((acc: {id: string, time: number}[], curr: string, index: number) => {
                if (index % 2 === 0) {
                    acc.push({ id: curr, time: Number(postIdTimeStrList[index + 1]) });
                  }
                return acc;
            }, []);

            var paging: Paging | undefined;

            const redisPostIds = postIdTime.map(item => item.id);

            // lastPostTime is inclusive in post service, so there is a chance of overlap of same post in redis and post service
            // using map to get rid of duplicate post that were posted on same time
            const postsMap = new Map<string, SinglePost>();
            var lowestTime = Number.MAX_VALUE;
            logger.trace("loaded from redis: ", redisPostIds.length);


            if (redisPostIds.length > 0) {
                const postByPostIdReq = new GetPostReq(redisPostIds, timelineHomeReq.returnAsUsername);
                const postByPostIdAxiosRes = await axios.post(getPostByPostIdUrl, postByPostIdReq);
                const postDetailsResObj = plainToInstance(PostDetailsRes, postByPostIdAxiosRes.data);
                for(const post of postDetailsResObj.posts) {
                    postsMap.set(post.postId, post);
                    lowestTime = Math.min(lowestTime, post.time);
                }
            }

            const morePostToLoad = timelineHomeReq.limit - postsMap.size;

            if (morePostToLoad > 0) {
                const lastPostTime = postsMap.size == 0? (timelineHomeReq.highTime || Date.now()): lowestTime;
                const lastPostId = redisPostIds.length == 0? undefined: redisPostIds[redisPostIds.length -1];

                const iFollowReq = new FollowersReq(userId, false, false);
                const iFollowAxiosRes = await axios.post(iFollowUrl, iFollowReq);
                const iFollowIdsObj = plainToInstance(FollowersRes, iFollowAxiosRes.data);

                const postByUserReq = new GetPostByUserReq(iFollowIdsObj.userIds, false, {highTime: lastPostTime, lastPostId: lastPostId, limit: morePostToLoad, returnAsUsername: timelineHomeReq.returnAsUsername});

                const postByUserAxiosRes = await axios.post(getPostByUserUrl, postByUserReq);
                const postDetailsResObj = plainToInstance(PostDetailsRes, postByUserAxiosRes.data);
                paging = postDetailsResObj.paging;

                for(const post of postDetailsResObj.posts) {
                    postsMap.set(post.postId, post);
                }
            }

            const postsToReturn: SinglePost[] = Array.from(postsMap.values());
            postsToReturn.sort((a, b) => b.time - a.time);

            res.status(200).json(new TimelineHomeRes(postsToReturn, paging));
        } catch(error) {
            logger.error("Error while get: ", error);
            res.status(500).json({error: error});
        }
    
    });

    return router;
}
