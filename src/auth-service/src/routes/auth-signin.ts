import express from 'express'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthSignInReq, AuthSignInRes, AuthInfo, UserSignInReq, UserSignInRes } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import jwt from 'jsonwebtoken';
import axios, { AxiosError } from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';
const jwt_access_expires_sec = Number(process.env.JWT_ACCESS_EXPIRES_SEC || '300'); //5min
const jwt_refresh_secret = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_00x';
const jwt_refresh_expires_sec = Number(process.env.JWT_REFRESH_EXPIRES_SEC || '1296000'); //15days

const ATTR_HEADER_DEVICE_ID = "device-id";

const userSignInUrl: string = process.env.USER_SERVICE_SIGN_IN_URL || "http://127.0.0.1:5002/v1/user/signin/";

export const createSignInRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.get('/', async (req, res, next) => {
        logger.trace(`POST /signin called`);

        const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

        if(!deviceId || typeof deviceId !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required`));
            return;
        }

        const authSignInObj = plainToInstance(AuthSignInReq, req.body);
        const errors = await validate(authSignInObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            const userSignInReq = new UserSignInReq({username: authSignInObj.username, email: authSignInObj.email}, authSignInObj.password);
            const postByUserAxiosRes = await axios.post(userSignInUrl, userSignInReq);
            const userSignInResObj = plainToInstance(UserSignInRes, postByUserAxiosRes.data);

            const authInfo = new AuthInfo(userSignInResObj.userId);
            const accessToken = jwt.sign({...authInfo}, jwt_access_secret, { expiresIn: jwt_access_expires_sec });
            const refreshToken = jwt.sign({...authInfo}, jwt_refresh_secret, { expiresIn: jwt_refresh_expires_sec });

            const redisKey = `refresh-token:${userSignInResObj.userId}:${deviceId}`;
            await redisClient.set(redisKey, refreshToken, {EX: jwt_refresh_expires_sec });
     
            res.status(200).json(new AuthSignInRes(accessToken, refreshToken, jwt_access_expires_sec));
        } catch(error) {
            if(error instanceof AxiosError) {
                if (error.response?.status == 403) {
                    res.status(403).json(new UnauthorizedRequest(error.response.data));
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