import express from 'express'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthInfo, AuthorizeClientReq, AuthorizeClientRes } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import { AxiosError } from 'axios';
import { genAccessRefreshToken, validateAccessToken } from './common/common';
import { v4 as uuidv4 } from 'uuid';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const authorize_code_exp_sec = Number(process.env.AUTH_CODE_EXPIRES_SEC || '120'); //2min

const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createAuthorizeClientRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /authorize called`);

        const authorizeClientObj = plainToInstance(AuthorizeClientReq, req.body);
        const errors = await validate(authorizeClientObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            logger.trace(JSON.stringify(authorizeClientObj));
            if (authorizeClientObj.response_type === "code") {
                const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];
                if(!authHeader || typeof authHeader !== 'string') {
                    res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
                    return;
                }

                const validateRet = validateAccessToken(authHeader);
                if (validateRet.statusCode == 200) {
                        
                const authInfo = validateRet.msg as AuthInfo;
                const uuidStr = uuidv4();

                const redisVal = new Map<string, string>([
                    ['userId', authInfo.userId],
                    ['clientId', authorizeClientObj.client_id!],
                    ['redirectUrl', authorizeClientObj.redirect_uri]
                ]);
                const redisKey = `authorization-code-${uuidStr}`;

                await redisClient.hSet(redisKey, Object.fromEntries(redisVal));
                await redisClient.expire(redisKey, authorize_code_exp_sec);

                res.status(200).json(new AuthorizeClientRes(uuidStr));
                }  else {
                    res.status(validateRet.statusCode).json(validateRet.msg);
                }
            } else if (authorizeClientObj.grant_type === "authorization_code") {
                let clientId;
                if (authorizeClientObj.client_id) {
                    clientId = authorizeClientObj.client_id;
                } else if(req.headers[ATTR_HEADER_AUTHORIZATION] && typeof req.headers[ATTR_HEADER_AUTHORIZATION] === "string") {
                    const base64str = req.headers[ATTR_HEADER_AUTHORIZATION].split(" ")[1];
                    const clientIdSecret = Buffer.from(base64str, 'base64').toString('utf-8');
                    clientId = clientIdSecret.split(":")[0];
                }

                if(!clientId) {
                    res.status(400).json(new InvalidRequest("Client id is required either in header authorization (Basic <base64>) or in body client_id (plain text)"));
                    return;
                }

                const redisKey = `authorization-code-${authorizeClientObj.code}`;
                const redisVal = await redisClient.hGetAll(redisKey);

                if (clientId == redisVal['clientId'] 
                    && authorizeClientObj.redirect_uri == redisVal['redirectUrl'] ) {
                        const authResp = await genAccessRefreshToken(redisClient, redisVal['userId'], clientId);
                        await redisClient.del(redisKey);
                        res.status(200).json(authResp);
                } else {
                    res.status(401).json(new UnauthorizedRequest("request didn't match with the access code expectation"));
                    return;
                }
            } else {
                res.status(400).json(new InvalidRequest("response_type=code or grant_type=authorization_code is required"));
                return;
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