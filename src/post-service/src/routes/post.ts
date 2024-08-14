import express from 'express'
import mongoose from '../clients/mongoClient';
import * as log4js from "log4js";

import { PostSchema } from '../models/post'
import { FanoutKafkaMessage } from '../models/fanout-kafka-message'
import { Producer } from 'kafkajs';
import axios, { AxiosResponse } from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_new_post_fanout_topic = process.env.KAFKA_NEW_POST_FANOUT_TOPIC || 'new-post';
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createPostRouter = (newPostKafkaProducer: Producer) => {
    router.post('/get', async (req, res, next) => {
        logger.trace(`POST /get called`);

        const reqBody = req.body;

        if(!reqBody.ids && !reqBody.id) {
            res.status(400).json(
                {error: "No id or ids"}
            );
            return;
        }

        const objectIdSet: Set<mongoose.Types.ObjectId> = new Set();
        if(reqBody.id && mongoose.Types.ObjectId.isValid(reqBody.id)) {
            objectIdSet.add(new mongoose.Types.ObjectId(String(reqBody.id)));
        }

        try {
            const postIds = JSON.parse(reqBody.ids);
            logger.warn(postIds);
            postIds.forEach((item: string) => {
                logger.warn(item);
                if(mongoose.Types.ObjectId.isValid(item)) {
                    objectIdSet.add(new mongoose.Types.ObjectId(item));
                }
            });
            
        } catch(error) {
            logger.error("Error parsing json: ", error);
            res.status(400).json(
                {error: "Invalid ids"}
            );
            return;
        }


        const Post = mongoose.model('Post', PostSchema);
        const posts = await Post.find({ _id: { $in: Array.from(objectIdSet)}}).sort( { time: -1 });

        res.status(200).json(
            posts
        );
    });

    router.post('/create', (req, res, next) => {
        logger.trace(`POST /create called`);
            
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
            return newPostKafkaProducer.send({
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
