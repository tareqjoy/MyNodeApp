import express from 'express'
import mongoose from '../clients/mongoClient';
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

export const createUserInternalRouter = (redisClient: RedisClientType<any, any, any>) => {
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

        const usernames = userIdsDto.getNormalizedIds();
        if (usernames.length == 0) {
            res.status(400).json(
                {
                    message: "Invalid request",
                    errors: "No username provided"
                }
            );
            return;
        }

        try {
            const nameToId = new Map<string, string | null>();
            for (const username of usernames) {
                const redisKey = `uid-map-username:${username}`;
                const userId = await redisClient.get(redisKey);
        
                if (userId != null) {
                    nameToId.set(username, userId);
                    logger.trace(`username found in redis: ${username}`)
                    continue;
                }
    
                logger.trace(`username not found in redis: ${username}`)
                const User = mongoose.model('User', UserSchema);
        
                const user = await User.findOne({ username: username }, { _id: 1 }).exec();
        
                if(user == null) {
                    nameToId.set(username, null);
                    continue;
                }
                
                redisClient.setEx(redisKey, Number(redisUsernameTtlSec), String(user._id));
                nameToId.set(username, String(user._id));
                logger.trace(`username cached into redis. key: ${username}, ttl: ${redisUsernameTtlSec}`)
            };

            const mapToObject = (map: Map<any, any>): Record<string, any> => {
                return Object.fromEntries(map);
            };

            res.status(200).json(mapToObject(nameToId));
        } catch(error) {
            logger.error("Error while finding user", error);
            res.status(500).json({error: "Internal Server Error"});
        }
    });
    return router;
};