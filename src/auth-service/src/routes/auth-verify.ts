import express from 'express'
import * as log4js from "log4js";
import { AuthInfo, AuthVerifyRes } from '@tareqjoy/models';
import { InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import jwt from 'jsonwebtoken';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';

const ATTR_HEADER_AUTHORIZATION = "authorization";


export const createVerifyRouter = () => {
    router.post('/verify', async (req, res, next) => {
        logger.trace(`POST /verify called`);

        const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];

        if(!authHeader || typeof authHeader !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
            return;
        }

        const accessToken = authHeader && authHeader.split(' ')[1];

        if (!accessToken) {
            return res.status(400).json(new InvalidRequest(`Access token missing`));
        }

        let authInfo;
        try {
            authInfo = jwt.verify(accessToken, jwt_access_secret) as AuthInfo;
        } catch(err) {
            if (err instanceof Error) {
                if (err.name === 'TokenExpiredError') {
                    res.status(403).json(new UnauthorizedRequest('Access token expired'));
                    return;
                }
            }
            res.status(400).json(new InvalidRequest(`Invalid access token`));
            return;
        }

        res.status(200).json(new AuthVerifyRes(authInfo.userId));
    });
    
    return router;
};