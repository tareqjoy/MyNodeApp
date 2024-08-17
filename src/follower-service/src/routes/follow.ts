import express from 'express'
import { Session, Result } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';
import { Request, Response } from 'express';

import * as log4js from "log4js";
import { FollowPostDto } from '../models/FollowPostDto';
import axios from 'axios';
import { UnfollowPostDto } from '../models/UnfollowPostDto';

const logger = log4js.getLogger();
logger.level = "trace";

const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();


export const createFollowerRouter = (neo4jSession: Session) => {
    router.get('/', (req, res, next) => {
        res.status(200).json({
            message: "Handling GET request to /follow"
        });
    });
    
    router.post('/follow', async (req: Request, res: Response) => {
        try {
            const followPostDto = plainToInstance(FollowPostDto, req.body);
            const errors = await validate(followPostDto);

            if (errors.length > 0) {
                res.status(400).json(
                    {
                        message: "Invalid request",
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints
                        }))
                    }
                );
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
                res.status(400).json(
                    {
                        message: "Invalid username"
                    }
                );
                return;
            }

            const usernameId = userIdResponse.data[followPostDto.username];
            const followsId = userIdResponse.data[followPostDto.followsUsername];

            const alreadyFollows = await neo4jSession.run(`
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]-(b:User {userId: $userId2})
                RETURN COUNT(r) > 0 AS exists
                `,
                { userId1: usernameId, userId2: followsId }
              );

            if (alreadyFollows.records[0].get('exists') as boolean) {      
                res.status(400).json({
                    message: "Already following"
                });
                return;
            }

            await neo4jSession.run(
                `
                MERGE (a:User {userId: $userId})
                MERGE (b:User {userId: $followsId})
                MERGE (a)-[r:FOLLOW]->(b)
                  ON CREATE SET r.followSince = $followSince, r.isMuted = $isMuted
                `,
                { userId: usernameId, followsId: followsId, followSince: followPostDto.followTime, isMuted: false }
              );
            

            res.status(200).json({
                message: "Followed"
            });

        } catch(error) {
            logger.error("Error while follow: ", error);
            res.status(500).json(
                {error: "Internal Server Error"}
            );
            return;
        }

    });

    router.post('/unfollow', async (req: Request, res: Response) => {
        try {
            const unfollowPostDto = plainToInstance(UnfollowPostDto, req.body);
            const errors = await validate(unfollowPostDto);

            if (errors.length > 0) {
                res.status(400).json(
                    {
                        message: "Invalid request",
                        errors: errors.map((err) => ({
                            property: err.property,
                            constraints: err.constraints
                        }))
                    }
                );
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
                res.status(400).json(
                    {
                        message: "Invalid username"
                    }
                );
                return;
            }

            const usernameId = userIdResponse.data[unfollowPostDto.username];
            const unfollowsId = userIdResponse.data[unfollowPostDto.unfollowsUsername];

            await neo4jSession.run(
                `
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                DELETE r
                `,
                { userId1: usernameId, userId2: unfollowsId }
              );

              res.status(200).json({
                message: "Unfollowed"
            });
        } catch(error) {
            logger.error("Error while follow: ", error);
            res.status(500).json(
                {error: "Internal Server Error"}
            );
            return;
        }
    });
    return router;
}
