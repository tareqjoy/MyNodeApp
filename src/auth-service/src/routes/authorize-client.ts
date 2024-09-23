import express from 'express'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthInfo, AuthorizeClientReq, AuthorizeClientRes } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import { AxiosError } from 'axios';
import { validateAccessToken } from './common/common';
import { v4 as uuidv4 } from 'uuid';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';
const authorize_code_exp_sec = Number(process.env.AUTH_CODE_EXPIRES_SEC || '120'); //2min

const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createAuthorizeClientRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /authorize called`);


        const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];
        if(!authHeader || typeof authHeader !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
            return;
        }

        const authorizeClientObj = plainToInstance(AuthorizeClientReq, req.body);
        const errors = await validate(authorizeClientObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            const validateRet = validateAccessToken(authHeader, jwt_access_secret);

            if (validateRet.statusCode == 200) {
                const authInfo = validateRet.msg as AuthInfo;
                const uuidStr = uuidv4();

                const redisVal = new Map<string, string>([
                    ['userId', authInfo.userId],
                    ['clientId', authorizeClientObj.clientId!]
                ]);
                const redisKey = `authorization-code-${uuidStr}`;

                await redisClient.hSet(redisKey, Object.fromEntries(redisVal));
                await redisClient.expire(redisKey, authorize_code_exp_sec);

                res.status(200).json(new AuthorizeClientRes(uuidStr, authorize_code_exp_sec));
            } else {
                res.status(validateRet.statusCode).json(validateRet.msg);
            }
        } catch(error) {
            if(error instanceof AxiosError) {
                if (error.response?.status == 403) {
                    res.status(401).json(new UnauthorizedRequest(error.response.data));
                    return;
                } else if (error.response?.status == 404) {
                    res.status(404).json(new InvalidRequest(error.response.data));
                    return;
                }

            }
            logger.error("Error while sign in", error);
            res.status(500).json(new InternalServerError());
        }
    });
    
    return router;
};