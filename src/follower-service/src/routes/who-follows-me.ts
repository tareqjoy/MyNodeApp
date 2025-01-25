import express from 'express'
import { Driver } from 'neo4j-driver';
import { Producer } from 'kafkajs';
import * as log4js from "log4js";
import { FollowersReq, FollowersReqInternal, InternalServerError, InvalidRequest } from '@tareqjoy/models';
import { parseAndExecuteQuery } from './common/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ATTR_HEADER_USER_ID } from '@tareqjoy/utils';
import axios from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

export const createWhoFollowsMeRouter = (neo4jDriver: Driver, isInternalEndpoint: boolean) => {
    const router = express.Router();
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /who-follows-me called`);

        const session = neo4jDriver.session();
        try {
            const followersQ = `
                MATCH (fuser:User)-[:FOLLOW]->(b:User {userId: $userId})
                RETURN fuser
            `;
            logger.trace("isInternalEndpoint: ", isInternalEndpoint, ", baseUrl: ", req.baseUrl);
            await parseAndExecuteQuery(isInternalEndpoint, userServiceHostUrl, req, res, session, followersQ);
            
        } catch(error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Error while /who-follows-me: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`);
            } else {
                logger.error("Error while /who-follows-me: ", error);
            }
            res.status(500).json(new InternalServerError());
        } finally {
            await session.close();
        }
    });
    return router;
}
