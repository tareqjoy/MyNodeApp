import express from 'express'
import { Session, Result } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';
import { Request, Response } from 'express';

import * as log4js from "log4js";
import { FollowPostDto } from '../models/FollowPostDto';
import axios from 'axios';

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

            const userIdResponse = await axios.get(userServiceHostUrl + followPostDto.userId);
            if (!userIdResponse.data || !userIdResponse.data.id) {
                res.status(400).json(
                    {
                        message: "Invalid userId"
                    }
                );
                return;
            }

            const result = await neo4jSession.run(
                `
                MERGE (user1:User {userId: $userId})
                MERGE (user2:User {userId: $followsId})
                MERGE (user1)-[followship:FOLLOW]->(user2)
                  ON CREATE SET followship.followSince = $followSince, followship.isMuted = $isMuted
                `,
                { userId: followPostDto.userId, followsId: followPostDto.followsId, followSince: followPostDto.followTime, isMuted: false }
              );

            result.records.forEach((record) => {
                const personNode = record.get('p');
                logger.debug(personNode.properties); // Output: { name: 'Alice', age: 30 }
              });
    
            res.status(200).json({
                message: "Handling POST request to /follow"
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
