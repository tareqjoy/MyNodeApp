import express from 'express'
import * as log4js from "log4js";
import { PostSchema } from '../models/post'
import { RedisClientType } from 'redis';
import axios from 'axios';
import { Mongoose } from 'mongoose';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";
const whoFollowsMeUrl: string = process.env.WHO_FOLLOWS_ME_URL || "http://127.0.0.1:5003/v1/follower/who-follows-me/";

const router = express.Router();

const POST_RETURN_LIMIT = 10;

export const createTimelineRouter = (mongoClient: Mongoose, redisClient: RedisClientType<any, any, any>) => {
    router.post('/home', async (req, res, next) => {
        logger.trace(`POST /home called`);
        

        const username: string = req.params.username;
        const start_time: number | null = req.query.start_time? Number(req.query.start_time): null;
    
        try {
            const userServiceBody = {
                username: username
            };

            const response = await axios.post(userServiceHostUrl, userServiceBody);
        
            if (!response || !response.data[username]) {
                logger.error(`Invalid from userService: ${response}`);
                res.status(500).json({error: "Invalid from userService"});
                return;
            }

            const userId = response.data[username];
            
            const redisKey = `timeline-userId:${userId}`;
            const redisResults = await redisClient.zRangeByScoreWithScores(redisKey, '-inf', start_time?? '+inf', { 
                    LIMIT: {
                        offset: 0,
                        count: POST_RETURN_LIMIT,
                    }
                }
            );

            const posts = redisResults.reverse().map(
                item => ({
                    _id: item.value,
                    time: item.score
                })
            );

            logger.trace("loaded from redis: ", posts.length);

            const morePostToLoad = POST_RETURN_LIMIT - posts.length;

            if (morePostToLoad > 0) {
                const lastPostTime = posts.length == 0? start_time: posts[posts.length - 1].time;

                const Post = mongoClient.model('Post', PostSchema);
                const queryParam = lastPostTime == null? { userid: userId} : { userid: userId, time: { $lt: lastPostTime } };
                const doc = await Post.find(queryParam, { _id: 1, time: 1 }).sort( { time: -1 }).limit(morePostToLoad).exec();


                const dbPosts = doc.map( item => ({
                    _id: String(item._id),
                    time: item.time
                }));

                logger.trace("loaded from mongodb: ", dbPosts.length);

                posts.push(...dbPosts);
            }

            res.status(200).json(posts);

        } catch(error) {
            logger.error("Error while get: ", error);
            res.status(500).json({error: error});
        }
    
    });

    return router;
}
