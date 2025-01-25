import express from 'express'
import { Driver } from 'neo4j-driver';
import { Producer } from 'kafkajs';
import * as log4js from "log4js";
import { FollowersReq, InternalServerError } from '@tareqjoy/models';
import { parseAndExecuteQuery } from './common/common';
import { ATTR_HEADER_USER_ID } from '@tareqjoy/utils';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";



export const createIFollowRouter = (neo4jDriver: Driver, isInternalEndpoint: boolean) => {
    const router = express.Router();
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /i-follow called`);

        const session = neo4jDriver.session();
        try {
            const followersQ = `
                MATCH (user:User {userId: $userId})-[:FOLLOW]->(fuser:User)
                RETURN fuser
            `;
            const session = neo4jDriver.session();
            await parseAndExecuteQuery(isInternalEndpoint, userServiceHostUrl, req, res, session, followersQ);
        } catch(error) {
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        } finally {
            await session.close();
        }
    });
    return router;
}