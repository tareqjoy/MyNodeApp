import express from 'express'
import { Driver, Session, Transaction } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';
import { Request, Response } from 'express';

import * as log4js from "log4js";
import { FollowReq, FollowersReq, UnfollowReq } from '@tareqjoy/models';
import { FollowRes, FollowersRes, UnfollowRes } from '@tareqjoy/models';
import { InvalidRequest, InternalServerError } from '@tareqjoy/models';
import axios from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

async function commonFollow(neo4jSession: Session, query: string, reqBody: any, res: Response) {
    const followersDto = plainToInstance(FollowersReq, reqBody);
    const errors = await validate(followersDto);

    if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
    }
    var usernameId;
    if (followersDto.username) {
        const userServiceBody = {
            username: followersDto.username
        };
    
        const userIdResponse = await axios.post(userServiceHostUrl, userServiceBody);
        if (!userIdResponse.data || !userIdResponse.data[followersDto.username]) {
            res.status(400).json(new InvalidRequest("Invalid username"));
            return;
        }
        usernameId = userIdResponse.data[followersDto.username];
    } else {
        usernameId = followersDto.userId;
    }

    const followers = await neo4jSession.run(query,{ userId: usernameId  });

    const whoFollows = [];

    for(const record of followers.records) {
        whoFollows.push(record.get('fuser').properties.userId);
    }

    if (followersDto.returnAsUsername) {
        const userIdServiceBody = {
            userIds: whoFollows
        };
    
        const userNameResponse = await axios.post(userServiceHostUrl, userIdServiceBody);
    
        const usernames = [];
        for(const key in userNameResponse.data) {
            usernames.push(userNameResponse.data[key]);
        }
    
        res.status(200).json(new FollowersRes(usernames, true));
    } else {
        res.status(200).json(new FollowersRes(whoFollows, false));
    }
}

export const createFollowerRouter = (neo4jDriver: Driver) => {
    router.post('/who-follows', async (req, res, next) => {
        const session = neo4jDriver.session();
        try {
            const followersQ = `
                MATCH (user:User {userId: $userId})-[:FOLLOW]->(fuser:User)
                RETURN fuser
            `;
            const session = neo4jDriver.session();
            await commonFollow(session, followersQ, req.body, res);
            await session.close();
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });

    router.post('/i-follow', async (req, res, next) => {
        const session = neo4jDriver.session();
        try {
            const followersQ = `
                MATCH (fuser:User)-[:FOLLOW]->(b:User {userId: $userId})
                RETURN fuser
            `;
            await commonFollow(session, followersQ, req.body, res);
            await session.close();
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });
    
    router.post('/follow', async (req: Request, res: Response) => {
        const session =  neo4jDriver.session();
        try {
            const followPostDto = plainToInstance(FollowReq, req.body);
            const errors = await validate(followPostDto);

            if (errors.length > 0) {
                res.status(400).json(new InvalidRequest(errors));
                return;
            }

            const userServiceBody = {
                usernames: [
                    followPostDto.username,
                    followPostDto.followsUsername
                ]
            };

            const userIdResponse = await axios.post(userServiceHostUrl, userServiceBody);
            if (!userIdResponse.data || !userIdResponse.data[followPostDto.username] || !userIdResponse.data[followPostDto.followsUsername]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }

            const usernameId = userIdResponse.data[followPostDto.username];
            const followsId = userIdResponse.data[followPostDto.followsUsername];

            const alreadyFollows = await session.run(`
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]-(b:User {userId: $userId2})
                RETURN COUNT(r) > 0 AS exists
                `,
                { userId1: usernameId, userId2: followsId }
              );

            if (alreadyFollows.records[0].get('exists') as boolean) {   
                res.status(400).json(new InvalidRequest("Already following"));   
                return;
            }

            await session.run(
                `
                MERGE (a:User {userId: $userId})
                MERGE (b:User {userId: $followsId})
                MERGE (a)-[r:FOLLOW]->(b)
                  ON CREATE SET r.followSince = $followSince, r.isMuted = $isMuted
                `,
                { userId: usernameId, followsId: followsId, followSince: followPostDto.followTime, isMuted: false }
            );
            
            await session.close();

            res.status(500).json(new FollowRes());
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });

    router.post('/unfollow', async (req: Request, res: Response) => {
        const session =  neo4jDriver.session();
        try {
            const unfollowPostDto = plainToInstance(UnfollowReq, req.body);
            const errors = await validate(unfollowPostDto);

            if (errors.length > 0) {
                logger.error(`Invalid request. ${Object.values(errors![0].constraints || "")}`)

            }

            if (errors.length > 0) {
                res.status(400).json(new InvalidRequest(errors));
                return;
            }

            const userServiceBody = {
                usernames: [
                    unfollowPostDto.username,
                    unfollowPostDto.unfollowsUsername
                ]
            };

            const userIdResponse = await axios.post(userServiceHostUrl, userServiceBody);
            if (!userIdResponse.data || !userIdResponse.data[unfollowPostDto.username] || !userIdResponse.data[unfollowPostDto.unfollowsUsername]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }

            const usernameId = userIdResponse.data[unfollowPostDto.username];
            const unfollowsId = userIdResponse.data[unfollowPostDto.unfollowsUsername];

            await session.run(
                `
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                DELETE r
                `,
                { userId1: usernameId, userId2: unfollowsId }
            );

            await session.close();

            res.status(500).json(new UnfollowRes());
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });
    return router;
}
