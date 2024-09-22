import express from 'express'
import * as log4js from "log4js";
import { AuthInfo, AuthRefreshRes,} from '@tareqjoy/models';
import { InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import jwt from 'jsonwebtoken';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';
const jwt_access_expires_sec = Number(process.env.JWT_ACCESS_EXPIRES_SEC || '300'); //5min
const jwt_refresh_secret = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_00x';

const ATTR_HEADER_DEVICE_ID = "device-id";
const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createRefreshRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /refresh called`);

        const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];
        const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

        if(!deviceId || typeof deviceId !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required`));
            return;
        }
        if(!authHeader || typeof authHeader !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
            return;
        }

        const reqRefreshToken = authHeader && authHeader.split(' ')[1];

        if (!reqRefreshToken) {
            return res.status(400).json(new InvalidRequest(`Refresh token missing`));
        }

        let refreshAuthInfo;
        try {
            refreshAuthInfo = jwt.verify(reqRefreshToken, jwt_refresh_secret) as AuthInfo;
        } catch(err) {
            if (err instanceof Error) {
                if (err.name === 'TokenExpiredError') {
                    res.status(401).json(new UnauthorizedRequest("Access token expired"));
                    return;
                }
            }
            res.status(400).json(new InvalidRequest(`Invalid refresh token`));
            return;
        }

        const redisKey = `refresh-token:${refreshAuthInfo.userId}:${deviceId}`;
        const redisRefreshToken = await redisClient.get(redisKey);

        if (!redisRefreshToken || redisRefreshToken !== reqRefreshToken) {
            res.status(403).json(new UnauthorizedRequest());
            return;
        }

        const authInfo = new AuthInfo(refreshAuthInfo.userId);
        const newAccessToken = jwt.sign({...authInfo}, jwt_access_secret, { expiresIn: jwt_access_expires_sec });

        res.status(200).json(new AuthRefreshRes(newAccessToken, jwt_access_expires_sec));
    });
    
    return router;
};