import express from 'express'
import mongoose, { Mongoose } from 'mongoose';
import { UserSchema } from '../schema/user-schema'
import * as log4js from "log4js";
import { RedisClientType } from 'redis';
import { plainToInstance } from 'class-transformer';
import { UserInternalReq } from '@tareqjoy/models';
import { InvalidRequest, InternalServerError, UserInternalRes } from '@tareqjoy/models';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const redisUsernameTtlSec: string = process.env.REDIS_USERNAME_TTL_SEC || "86400";

const router = express.Router();

export const createUserInternalRouter = (mongoClient: Mongoose, redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST UserInternal called`);

        const userIdsDto = plainToInstance(UserInternalReq, req.body);

        const errors = await validate(userIdsDto);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        const combined: [string, string][] = [];

        userIdsDto.getNormalizedUsernames().map(str => combined.push([str, "uname"]));
        userIdsDto.getNormalizedIds().map(str => combined.push([str, "uid"]));

        try {
            const toUsername = new Map<string, string | null>();
            const toUserId = new Map<string, string | null>();
            for (const [nameOrId, tag] of combined) {
                const redisKey = tag == "uname"? `uname-uid:${nameOrId}`: `uid-uname:${nameOrId}`;
                const redisNameOrId = await redisClient.get(redisKey);
        
                if (redisNameOrId != null) {
                    if (tag == "uname") {
                        toUserId.set(nameOrId, redisNameOrId);
                    } else {
                        toUsername.set(nameOrId, redisNameOrId);
                    }
                    
                    logger.trace(`found in redis: ${nameOrId} -> ${redisNameOrId}`)
                    continue;
                }
    
                logger.trace(`not found in redis: ${nameOrId}`)
                const User = mongoClient.model('User', UserSchema);
                
                const query = tag == "uname"? { username: nameOrId }: { _id: new mongoose.Types.ObjectId(nameOrId) };
                const user = await User.findOne(query, { _id: 1, username: 1 }).exec();
        
                if(user == null) {
                    if (tag == "uname") {
                        toUserId.set(nameOrId, null);
                    } else {
                        toUsername.set(nameOrId, null);
                    }
                    logger.trace(`not found in mongodb: ${nameOrId}`)
                    continue;
                }
                
                const value =  tag == "uname"? String(user._id): user.username;
                redisClient.setEx(redisKey, Number(redisUsernameTtlSec), value);
                if (tag == "uname") {
                    toUserId.set(nameOrId, value);
                } else {
                    toUsername.set(nameOrId, value);
                }
                logger.trace(`username cached into redis. key: ${nameOrId}, ttl: ${redisUsernameTtlSec}`)
            };

            res.status(200).json(new UserInternalRes(toUsername, toUserId));
        } catch(error) {
            logger.error("Error while finding user", error);
            res.status(500).json(new InternalServerError());
        }
    });
    return router;
};