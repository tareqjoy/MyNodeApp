import express from 'express'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthGenerateReq, AuthGenerateRes } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import jwt from 'jsonwebtoken';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';
const jwt_access_expires_sec = Number(process.env.JWT_ACCESS_EXPIRES_SEC || '300');
const jwt_refresh_secret = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_00x';
const jwt_refresh_expires_sec = Number(process.env.JWT_REFRESH_EXPIRES_SEC || '1296000');

const ATTR_HEADER_DEVICE_ID = "device-id";

export const createAuthGenerateRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST / called`);

        const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

        if(!deviceId || typeof deviceId !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required`));
            return;
        }

        const authGenObj = plainToInstance(AuthGenerateReq, req.body);
        const errors = await validate(authGenObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            const accessToken = jwt.sign({userId: authGenObj.userId}, jwt_access_secret, { expiresIn: String(jwt_access_expires_sec) });
            const refreshToken = jwt.sign({userId: authGenObj.userId}, jwt_refresh_secret, { expiresIn: String(jwt_refresh_expires_sec) });

            const redisKey = `refresh-token:${authGenObj.userId}:${deviceId}`;
            await redisClient.set(redisKey, refreshToken, {EX: jwt_refresh_expires_sec })
     
            res.status(200).json(new AuthGenerateRes(accessToken, refreshToken, jwt_access_expires_sec));
        } catch(error) {
            logger.error("Error while sign in", error);
            res.status(500).json(new InternalServerError());
        }

    });
    
    return router;
};

