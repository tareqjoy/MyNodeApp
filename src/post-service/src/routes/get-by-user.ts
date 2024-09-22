import express from 'express'
import * as log4js from "log4js";
import mongoose, { Mongoose } from 'mongoose';
import { PostSchema } from '../db/PostSchema'
import { Producer } from 'kafkajs';
import axios from 'axios';
import { GetPostByUserReq, UserInternalReq, UserInternalRes, Paging } from '@tareqjoy/models';
import { InvalidRequest } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { toResPosts, getTimeSortedGetPostIdsByUserListQuery } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createGetByUserRouter = (mongoClient: Mongoose) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /get-by-user called`);

        const getPostReq = plainToInstance(GetPostByUserReq, req.body);
        const errors = await validate(getPostReq);
    
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }
        const userIds: Set<string> = new Set()
        if (getPostReq.userIds) {
            for(const id of getPostReq.userIds) {
                userIds.add(id);
            }
        } 
        if (getPostReq.usernames) {
            const pUserInternalReq = new UserInternalReq(getPostReq.usernames, true);
            const pUserIdAxiosResponse = await axios.post(userServiceHostUrl, pUserInternalReq);
            const pUserResObj = plainToInstance(UserInternalRes, pUserIdAxiosResponse.data);

            for(const key in pUserResObj.toUserIds) {
                userIds.add(pUserResObj.toUserIds[key]);
            }
        }

        const userMongoIds: mongoose.Types.ObjectId[] = []

        userIds.forEach((item: string) => {
            if(mongoose.Types.ObjectId.isValid(item)) {
                userMongoIds.push(new mongoose.Types.ObjectId(item));
            }
        });
        
        const Post = mongoClient.model('Post', PostSchema);

        const projection = getPostReq.returnOnlyPostId? {_id: 1, time: 1}: {};

        var lastPostTime = Date.now();
        if (getPostReq.lastPostId) {
            const lastPost = await Post.findOne({ _id: getPostReq.lastPostId }, { time: 1});
            if (lastPost) {
                lastPostTime = lastPost.time;
            } else {
                res.status(400).json(new InvalidRequest("no post found by lastPostId."));
                return;
            }
        }


        const dbPosts = await Post.find(getTimeSortedGetPostIdsByUserListQuery(userMongoIds, lastPostTime, getPostReq.lastPostId), projection).sort( { time: -1, _id: -1 }).limit(getPostReq.limit);

        var paging: Paging | undefined;
        if (dbPosts.length == getPostReq.limit) {
            paging = new Paging(dbPosts[dbPosts.length-1].id.toString());
        }
        res.status(200).json(await toResPosts(userServiceHostUrl, dbPosts, getPostReq.returnOnlyPostId, getPostReq.returnAsUsername, paging));
    });

    return router;
}
