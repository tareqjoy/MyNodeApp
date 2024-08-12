import express from 'express'
import mongoose from '../clients/mongoClient';
import * as log4js from "log4js";

import { PostSchema } from '../models/post'
import { FanoutKafkaMessage } from '../models/fanout-kafka-message'
import { Producer } from 'kafkajs';
import { RedisClientType } from 'redis';
import axios, { AxiosResponse } from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_new_post_fanout_topic = process.env.KAFKA_NEW_POST_FANOUT_TOPIC || 'new-post';
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

const POST_RETURN_LIMIT = 10;

export const createTimelineRouter = (fanoutProducer: Producer, redisClient: RedisClientType<any, any, any>) => {
    router.get('/:username', async (req, res, next) => {
        logger.trace(`GET /:username called`);
        

        const username: string = req.params.username;
        const start_time: number | null = req.query.start_time? Number(req.query.start_time): null;
    
        try {
            const response = await axios.get(userServiceHostUrl + username);
        
            if (!response || !response.data.id) {
                logger.error(`Invalid from userService: ${response}`);
                res.status(500).json({error: "Invalid from userService"});
            }

            const userId = response.data.id;
            
            const redisKey = `userId:${userId}`;
            const redisResults = await redisClient.zRangeByScoreWithScores(redisKey, start_time?? 0, '+inf', { 
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

            const morePostToLoad = POST_RETURN_LIMIT - posts.length;

            if (morePostToLoad > 0) {
                const lastPostTime = posts.length == 0? null: posts[posts.length - 1].time;
                posts
                const Post = mongoose.model('Post', PostSchema);
                const queryParam = lastPostTime == null? { userid: userId} : { userid: userId, time: { $lte: lastPostTime } };
                const doc = await Post.find(queryParam, { _id: 1, time: 1 }).sort( { time: -1 }).limit(morePostToLoad).exec();


                const dbPosts = doc.map( item => ({
                    _id: String(item._id),
                    time: item.time
                }));

                posts.push(...dbPosts);
            }

            res.status(200).json(posts);

        } catch(error) {
            logger.error("Error while get: ", error);
            res.status(500).json({error: error});
        }
    
    });
    
    router.post('/', (req, res, next) => {
        logger.trace(`POST / called`);
            
        const username = req.body.username
    
    
        axios.get(userServiceHostUrl + username).then((reponse: AxiosResponse) => {
            return reponse.data.id
        }).then((userid: string) => {
            const Post = mongoose.model('Post', PostSchema);
    
            const post = new Post({
                _id: new mongoose.Types.ObjectId(),
                userid: userid,
                body: req.body.body,
                time: Date.now()
            })
    
            return post.save();
    
        }).then((result: any) => {
            const msg = new FanoutKafkaMessage(result._id.toString(), result.userid.toString(), result.time);
            logger.debug(`publishing Kafka: topic: ${kafka_new_post_fanout_topic}`);
            return fanoutProducer.send({
                topic: kafka_new_post_fanout_topic,
                messages: [
                    {
                        key: msg.postId,
                        value: JSON.stringify(msg)
                    }
                ]
            })
        }).then((result: any) => {
            res.status(200).json({
                message: "Ok"
            });
        })
        .catch((err: any) => {
            // Handle error
            logger.error(err);
            res.status(500).json({error: err});
        });
    });

    return router;
}
