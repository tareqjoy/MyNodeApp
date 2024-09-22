import express from 'express'
import { Driver } from 'neo4j-driver';
import { Producer } from 'kafkajs';
import * as log4js from "log4js";
import { InternalServerError } from '@tareqjoy/models';
import { commonFollow } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createIFollowRouter = (neo4jDriver: Driver) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /i-follow called`);
        const session = neo4jDriver.session();
        try {
            const followersQ = `
                MATCH (user:User {userId: $userId})-[:FOLLOW]->(fuser:User)
                RETURN fuser
            `;
            const session = neo4jDriver.session();
            await commonFollow(userServiceHostUrl, session, followersQ, req.body, res);
            await session.close();
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });
    return router;
}