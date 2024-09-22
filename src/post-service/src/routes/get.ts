import express from 'express'
import * as log4js from "log4js";
import mongoose, { Mongoose } from 'mongoose';
import { PostSchema } from '../db/PostSchema'
import { TooLargeRequest, GetPostReq } from '@tareqjoy/models';
import { InvalidRequest } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { toResPosts } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";
const maxGetPostLimit: number = parseInt(process.env.MAX_GET_POST_LIMIT || "100");

const router = express.Router();

export const createGetRouter = (mongoClient: Mongoose) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /get called`);

        const getPostReq = plainToInstance(GetPostReq, req.body);
        const errors = await validate(getPostReq);
    
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }
        const postIds = getPostReq.getNormalizedPostIds();
        if (postIds.length > maxGetPostLimit) {
            res.status(403).json(new TooLargeRequest(maxGetPostLimit));
            return;
        }

        const postObjectIds: mongoose.Types.ObjectId[] = [];
        try {
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

        res.status(200).json(await toResPosts(userServiceHostUrl, dbPosts, false, getPostReq.returnAsUsername));
    });

    return router;
}