import express from 'express'
import { Driver } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { Producer } from 'kafkajs';
import * as log4js from "log4js";
import { FollowReq, IFollowedKafkaMsg, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { FollowRes } from '@tareqjoy/models';
import { InvalidRequest, InternalServerError } from '@tareqjoy/models';
import axios from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_i_followed_fanout_topic = process.env.KAFKA_I_FOLLOWED_FANOUT_TOPIC || 'i-followed';
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createFollowRouter = (neo4jDriver: Driver, kafkaProducer: Producer) => {
    router.post('/', async (req: Request, res: Response) => {
        logger.trace(`POST /follow called`);
        const session =  neo4jDriver.session();
        try {
            const followPostDto = plainToInstance(FollowReq, req.body);
            const errors = await validate(followPostDto);

            if (errors.length > 0) {
                res.status(400).json(new InvalidRequest(errors));
                return;
            }

            const userInternalReq = new UserInternalReq([followPostDto.username, followPostDto.followsUsername], true);
            const userIdResponse = await axios.post(userServiceHostUrl, userInternalReq);

            const userInternalResponse = plainToInstance(UserInternalRes, userIdResponse.data);

            if (!userInternalResponse.toUserIds || !userInternalResponse.toUserIds[followPostDto.username] || !userInternalResponse.toUserIds[followPostDto.followsUsername]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }

            const usernameId = userInternalResponse.toUserIds[followPostDto.username];
            const followsId = userInternalResponse.toUserIds[followPostDto.followsUsername];

            const alreadyFollows = await session.run(`
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
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

            const kafkaMsg = new IFollowedKafkaMsg(usernameId, followsId);
            logger.debug(`publishing Kafka: topic: ${kafka_i_followed_fanout_topic}`);
            await kafkaProducer.send({
                topic: kafka_i_followed_fanout_topic,
                messages: [
                    {
                        key: usernameId,
                        value: JSON.stringify(kafkaMsg)
                    }
                ]
            })

            res.status(200).json(new FollowRes());
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });

    return router;
}