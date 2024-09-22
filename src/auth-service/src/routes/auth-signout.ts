import express from 'express'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthInfo,  AuthSignoutReq, MessageResponse } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import { validateAccessToken } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';

const ATTR_HEADER_DEVICE_ID = "device-id";
const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createSignOutRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /signout called`);

        const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];
        if(!authHeader || typeof authHeader !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
            return;
        }

        const authSignOutObj = plainToInstance(AuthSignoutReq, req.body);
        const errors = await validate(authSignOutObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

        if(!authSignOutObj.allDevices && (!deviceId || typeof deviceId !== 'string')) {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required or allDevices set to true in body`));
            return;
        }

        try {
            const validateRet = validateAccessToken(authHeader, jwt_access_secret);

            if (validateRet.statusCode == 200) {
                const authInfo = validateRet.msg as AuthInfo;

                let deviceIdField = deviceId as string;
                if(authSignOutObj.allDevices) {
                    deviceIdField = '*';
                }
                const redisKey = `refresh-token:${authInfo.userId}:${deviceIdField}`;
                const signOutCount = await redisClient.del(redisKey);

                res.status(200).json(new MessageResponse(`Logged out from ${signOutCount} devices`));
            } else {
                res.status(validateRet.statusCode).json(validateRet.msg);
            }

        } catch(error) {
            logger.error("Error while sign out", error);
            res.status(500).json(new InternalServerError());
        }
    });
    
    return router;
};