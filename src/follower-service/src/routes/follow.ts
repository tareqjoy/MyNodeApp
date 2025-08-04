import express from "express";
import { Driver } from "neo4j-driver";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { Producer } from "kafkajs";
import { getFileLogger } from "@tareqjoy/utils";
import {
  FollowReq,
  IFollowedKafkaMsg,
  UserInternalReq,
  UserInternalRes,
} from "@tareqjoy/models";
import { FollowRes } from "@tareqjoy/models";
import { InvalidRequest, InternalServerError } from "@tareqjoy/models";
import axios from "axios";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const kafka_i_followed_fanout_topic =
  process.env.KAFKA_I_FOLLOWED_FANOUT_TOPIC || "i-followed";
const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createFollowRouter = (
  neo4jDriver: Driver,
  kafkaProducer: Producer,
) => {
  router.post("/", async (req: Request, res: Response) => {
    logger.silly(`POST /follow called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    const session = neo4jDriver.session();
    try {
      const followPostDto = plainToInstance(FollowReq, req.body);
      const errors = await validate(followPostDto);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }

      const userInternalReq = new UserInternalReq(
        [followPostDto.followsUsername],
        true,
      );
      const userIdResponse = await axios.post(
        userServiceHostUrl,
        userInternalReq,
      );

      const userInternalResponse = plainToInstance(
        UserInternalRes,
        userIdResponse.data,
      );

      if (
        !userInternalResponse.toUserIds ||
        !userInternalResponse.toUserIds[followPostDto.followsUsername]
      ) {
        res.status(400).json(new InvalidRequest("Invalid username"));
        return;
      }

      const followsId =
        userInternalResponse.toUserIds[followPostDto.followsUsername];

      if (loggedInUserId == followsId) {
        res.status(400).json(new InvalidRequest("Cannot follow self"));
        return;
      }

      const alreadyFollows = await session.run(
        `
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                RETURN COUNT(r) > 0 AS exists
                `,
        { userId1: loggedInUserId, userId2: followsId },
      );

      if (alreadyFollows.records[0].get("exists") as boolean) {
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
        {
          userId: loggedInUserId,
          followsId: followsId,
          followSince: followPostDto.followTime,
          isMuted: false,
        },
      );

      const kafkaMsg = new IFollowedKafkaMsg(loggedInUserId, followsId);
      logger.debug(`publishing Kafka: topic: ${kafka_i_followed_fanout_topic}`);
      await kafkaProducer.send({
        topic: kafka_i_followed_fanout_topic,
        messages: [
          {
            key: loggedInUserId,
            value: JSON.stringify(kafkaMsg),
          },
        ],
      });

      res.status(200).json(new FollowRes());
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /follow: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /follow: ", error);
      }
      res.status(500).json(new InternalServerError());
    } finally {
      await session.close();
    }
  });

  return router;
};
