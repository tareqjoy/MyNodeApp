import express from 'express'
import { Driver } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { Producer } from 'kafkajs';
import * as log4js from "log4js";
import { UnfollowReq, UserInternalReq, UserInternalRes, IUnfollowedKafkaMsg } from '@tareqjoy/models';
import { UnfollowRes } from '@tareqjoy/models';
import { InvalidRequest, InternalServerError } from '@tareqjoy/models';
import axios from 'axios';

const logger = log4js.getLogger();
logger.level = "trace";

const kafka_i_unfollowed_fanout_topic = process.env.KAFKA_I_UNFOLLOWED_FANOUT_TOPIC || 'i-unfollowed';
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createUnfollowRouter = (neo4jDriver: Driver, kafkaProducer: Producer) => {
    router.post('/', async (req: Request, res: Response) => {
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


            const userInternalReq = new UserInternalReq([unfollowPostDto.username, unfollowPostDto.unfollowsUsername], true);
            const userIdResponse = await axios.post(userServiceHostUrl, userInternalReq);

            const userInternalResponse = plainToInstance(UserInternalRes, userIdResponse.data);

            if (!userInternalResponse.toUserIds || !userInternalResponse.toUserIds[unfollowPostDto.username] || !userInternalResponse.toUserIds[unfollowPostDto.unfollowsUsername]) {
                res.status(400).json(new InvalidRequest("Invalid username"));
                return;
            }

            const usernameId = userInternalResponse.toUserIds[unfollowPostDto.username];
            const unfollowsId = userInternalResponse.toUserIds[unfollowPostDto.unfollowsUsername];

            const ifFollows = await session.run(`
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                RETURN COUNT(r) > 0 AS exists
                `,
                { userId1: usernameId, userId2: unfollowsId }
              );

            if (!ifFollows.records[0].get('exists') as boolean) {   
                res.status(400).json(new InvalidRequest("Already not following"));   
                return;
            }

            await session.run(
                `
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                DELETE r
                `,
                { userId1: usernameId, userId2: unfollowsId }
            );

            await session.close();


            const kafkaMsg = new IUnfollowedKafkaMsg(usernameId, unfollowsId);
            logger.debug(`publishing Kafka: topic: ${kafka_i_unfollowed_fanout_topic}`);
            await kafkaProducer.send({
                topic: kafka_i_unfollowed_fanout_topic,
                messages: [
                    {
                        key: usernameId,
                        value: JSON.stringify(kafkaMsg)
                    }
                ]
            })

            res.status(200).json(new UnfollowRes());
        } catch(error) {
            await session.close();
            logger.error("Error while follow: ", error);
            res.status(500).json(new InternalServerError());
        }
    });
    return router;
}