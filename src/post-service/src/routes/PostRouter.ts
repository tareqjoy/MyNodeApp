import express from 'express'
import * as log4js from "log4js";
import mongoose, { Mongoose } from 'mongoose';
import { PostSchema } from '../models/PostSchema'
import { Producer } from 'kafkajs';
import axios, { AxiosResponse } from 'axios';
import { GetPostByUserReq, GetPostReq, InternalServerError, MessageResponse, PostDetailsRes, SinglePost, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { CreatePostReq, FollowersRes } from '@tareqjoy/models';
import { InvalidRequest, NewPostKafkaMsg } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_new_post_fanout_topic = process.env.KAFKA_NEW_POST_FANOUT_TOPIC || 'new-post';
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

async function toResPosts(dbPosts: any, returnAsUsername: boolean): Promise<PostDetailsRes> {
    const resPosts: SinglePost[] = [];
    if (returnAsUsername) {
        const pUserIds: string[] = [];

        for(const dbp of dbPosts) {
            pUserIds.push(dbp.userid!.toString());
        }

        const pUserInternalReq = new UserInternalReq(pUserIds, false);
        const pUserIdAxiosResponse = await axios.post(userServiceHostUrl, pUserInternalReq);

        const pUserResObj = plainToInstance(UserInternalRes, pUserIdAxiosResponse.data);

        for(const dbp of dbPosts) {
            resPosts.push(new SinglePost(dbp.id, pUserResObj.toUsernames![dbp.userid!.toString()], dbp.body, dbp.time, true));
        }
    } else {
        for(const dbp of dbPosts) {
            resPosts.push(new SinglePost(dbp.id, dbp.userid!.toString(), dbp.body, dbp.time, false));
        }
    }

    return new PostDetailsRes(resPosts);
}

export const createPostRouter = (mongoClient: Mongoose, newPostKafkaProducer: Producer) => {
    router.post('/get', async (req, res, next) => {
        logger.trace(`POST /get called`);

        const getPostReq = plainToInstance(GetPostReq, req.body);
        const errors = await validate(getPostReq);
    
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        const postObjectIds: mongoose.Types.ObjectId[] = [];
        try {
            const postIds = getPostReq.getNormalizedPostIds();
            postIds.forEach((item: string) => {
                if(mongoose.Types.ObjectId.isValid(item)) {
                    postObjectIds.push(new mongoose.Types.ObjectId(item));
                }
            });
            
        } catch(error) {
            logger.error("Error parsing json: ", error);
            res.status(400).json(
                {error: "Invalid ids"}
            );
            return;
        }


        const Post = mongoClient.model('Post', PostSchema);
        const dbPosts = await Post.find({ _id: { $in: Array.from(postObjectIds)}}).sort( { time: -1 });

        res.status(200).json(await toResPosts(dbPosts, getPostReq.returnAsUsername));
    });

    router.post('/get-by-user', async (req, res, next) => {
        logger.trace(`POST /get-by-user called`);

        const getPostReq = plainToInstance(GetPostByUserReq, req.body);
        const errors = await validate(getPostReq);
    
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }
        var userIds = []
        if (getPostReq.userIds) {
            userIds = getPostReq.userIds;
        } else {
            const pUserInternalReq = new UserInternalReq(getPostReq.usernames, true);
            const pUserIdAxiosResponse = await axios.post(userServiceHostUrl, pUserInternalReq);
            const pUserResObj = plainToInstance(UserInternalRes, pUserIdAxiosResponse.data);

            for(const key in pUserResObj.toUserIds) {
                userIds.push(pUserResObj.toUserIds[key]);
            }
        }

        const userMongoIds: mongoose.Types.ObjectId[] = []

        userIds.forEach((item: string) => {
            if(mongoose.Types.ObjectId.isValid(item)) {
                userMongoIds.push(new mongoose.Types.ObjectId(item));
            }
        });
        

        const Post = mongoClient.model('Post', PostSchema);
        const dbPosts = await Post.find({ userid: { $in: userMongoIds}, time: { $lt: getPostReq.startTime } }).sort( { time: -1 }).limit(getPostReq.limit);

        res.status(200).json(await toResPosts(dbPosts, getPostReq.returnAsUsername));
    });

    router.post('/create', async (req, res, next) => {
        logger.trace(`POST /create called`);
        
        try {
            const createPostReq = plainToInstance(CreatePostReq, req.body);
            const errors = await validate(createPostReq);
        
            if (errors.length > 0) {
                res.status(400).json(new InvalidRequest(errors));
                return;
            }
    
            const pUserInternalReq = new UserInternalReq(createPostReq.username, true);
            const pUserIdAxiosResponse = await axios.post(userServiceHostUrl, pUserInternalReq);
    
            const pUserResObj = plainToInstance(UserInternalRes, pUserIdAxiosResponse.data);
    
            if (!pUserResObj.toUserIds || !pUserResObj.toUserIds[createPostReq.username]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }
    
            const Post = mongoClient.model('Post', PostSchema);
        
            
            const post = new Post({
                _id: new mongoose.Types.ObjectId(),
                userid: pUserResObj.toUserIds[createPostReq.username],
                body: createPostReq.body,
                time: createPostReq.postTime
            })
    
            const dbResult = await post.save();
            logger.debug(`saved to mongodb with postId: ${dbResult.id}`);
    
            const kafkaMsg = new NewPostKafkaMsg(dbResult.id, dbResult.userid!.toString(), dbResult.time);
            logger.debug(`publishing Kafka: topic: ${kafka_new_post_fanout_topic}`);
            await newPostKafkaProducer.send({
                topic: kafka_new_post_fanout_topic,
                messages: [
                    {
                        key: dbResult.id,
                        value: JSON.stringify(kafkaMsg)
                    }
                ]
            })
    
            res.status(200).json(new MessageResponse("Posted"));
        } catch (error) {
            logger.error("Error while posting: ", error);
            res.status(500).json(new InternalServerError());
        }
        
    });

    return router;
}
