import express from 'express'
import mongoose, { Mongoose } from 'mongoose';
import { UserSchema } from '../models/user'
import * as log4js from "log4js";
import { RedisClientType } from 'redis';
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { UserIdsDto } from '../models/UserIdsDto';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const redisUsernameTtlSec: string = process.env.REDIS_USERNAME_TTL_SEC || "86400";

const router = express.Router();

export const createUserInternalRouter = (mongoClient: Mongoose, redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST UserInternal called`);

        const userIdsDto = plainToInstance(UserIdsDto, req.body);

        const errors = await validate(userIdsDto);
        if (errors.length > 0) {
            res.status(400).json(
                {
                    message: "Invalid request",
                    errors: errors.map((err) => ({
                        property: err.property,
                        constraints: err.constraints
                    }))
                }
            );
            return;
        }

        const combined: [string, string][] = [];

        userIdsDto.getNormalizedUsernames().map(str => combined.push([str, "uname"]));
        userIdsDto.getNormalizedIds().map(str => combined.push([str, "uid"]));

        try {
            const map = new Map<string, string | null>();
            for (const [nameOrId, tag] of combined) {
                const redisKey = tag == "uname"? `uname-uid:${nameOrId}`: `uid-uname:${nameOrId}`;
                const redisNameOrId = await redisClient.get(redisKey);
        
                if (redisNameOrId != null) {
                    map.set(nameOrId, redisNameOrId);
                    logger.trace(`found in redis: ${nameOrId} -> ${redisNameOrId}`)
                    continue;
                }
    
                logger.trace(`not found in redis: ${nameOrId}`)
                const User = mongoClient.model('User', UserSchema);
                
                const query = tag == "uname"? { username: nameOrId }: { _id: new mongoose.Types.ObjectId(nameOrId) };
                const user = await User.findOne(query, { _id: 1, username: 1 }).exec();
        
                if(user == null) {
                    map.set(nameOrId, null);
                    logger.trace(`not found in mongodb: ${nameOrId}`)
                    continue;
                }
                
                const value =  tag == "uname"? String(user._id): user.username;
                redisClient.setEx(redisKey, Number(redisUsernameTtlSec), value);
                map.set(nameOrId, value);
                logger.trace(`username cached into redis. key: ${nameOrId}, ttl: ${redisUsernameTtlSec}`)
            };

            const mapToObject = (map: Map<any, any>): Record<string, any> => {
                return Object.fromEntries(map);
            };

            res.status(200).json(mapToObject(map));
        } catch(error) {
            logger.error("Error while finding user", error);
            res.status(500).json({error: "Internal Server Error"});
        }
    });
    return router;
};