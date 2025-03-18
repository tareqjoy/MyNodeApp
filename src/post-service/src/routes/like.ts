import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import { MongoServerError } from "mongodb";
import { Producer } from "kafkajs";
import axios from "axios";
import {
  InternalServerError,
  LikeReq,
  MessageResponse,
  PostLikeKafkaMsg,
  UnlikeReq,
  SingleLike,
  UserLike,
  WhoLikedRes,
} from "@tareqjoy/models";
import { InvalidRequest } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ATTR_HEADER_USER_ID,
  fillString,
  REDIS_KEY_POST_LIKE_COUNT,
} from "@tareqjoy/utils";
import { RedisClientType } from "redis";
import { PostLike } from "@tareqjoy/clients";
import {
  getPostLikeCount,
} from "./common/common";

const logger = getFileLogger(__filename);

const kafka_post_like_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "post-like";

const router = express.Router();

export const createLikeRouter = (
  mongoClient: Mongoose,
  redisClient: RedisClientType<any, any, any>,
  newPostKafkaProducer: Producer
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /like called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;

    const type = req.query.type as string;
    if (!(typeof type === "string" && (type === "like" || type === "unlike"))) {
      res
        .status(400)
        .json(
          new InvalidRequest(
            "invalid type parameter. needs to be either like or unlike"
          )
        );
      return;
    }
    try {
      if (type === "like") {
        const likeReq = plainToInstance(LikeReq, req.body);
        const errors = await validate(likeReq);

        if (errors.length > 0) {
          res.status(400).json(new InvalidRequest(errors));
          return;
        }

        const kafkaMsg = new PostLikeKafkaMsg("like", loggedInUserId, likeReq);
        logger.debug(
          `publishing Kafka: topic: ${kafka_post_like_fanout_topic}`
        );
        const kafkaResp = await newPostKafkaProducer.send({
          topic: kafka_post_like_fanout_topic,
          messages: [
            {
              key: likeReq.postId,
              value: JSON.stringify(kafkaMsg),
            },
          ],
        });
        logger.debug(`response from kafka:  ${JSON.stringify(kafkaResp)}`);
        res.status(200).json(new MessageResponse("liked"));
      } else {
        const unlikeReq = plainToInstance(UnlikeReq, req.body);
        const errors = await validate(unlikeReq);

        if (errors.length > 0) {
          res.status(400).json(new InvalidRequest(errors));
          return;
        }

        const kafkaMsg = new PostLikeKafkaMsg(
          "unlike",
          loggedInUserId,
          unlikeReq
        );
        logger.debug(
          `publishing Kafka: topic: ${kafka_post_like_fanout_topic}`
        );
        const kafkaResp = await newPostKafkaProducer.send({
          topic: kafka_post_like_fanout_topic,
          messages: [
            {
              key: unlikeReq.postId,
              value: JSON.stringify(kafkaMsg),
            },
          ],
        });

        logger.debug(`response from kafka:  ${JSON.stringify(kafkaResp)}`);
        res.status(200).json(new MessageResponse("unliked"));
      }
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        res.status(400).json(new MessageResponse("Already liked"));
        return;
      } else if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get("/count", async (req, res, next) => {
    logger.silly(`GET /like/count called`);

    try {
      const postId = req.query.postId as string;

      if (!postId) {
        res
          .status(400)
          .json(new InvalidRequest("postId is expected in query param"));
        return;
      }

      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json(new InvalidRequest("bad postId"));
        return;
      }

      const likeResp = await getPostLikeCount(redisClient, [postId]);

      res.status(200).json(likeResp.get(postId));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get("/who", async (req, res, next) => {
    logger.silly(`GET /like/who called`);

    try {
      const { postId } = req.query;

      if (!postId) {
        res
          .status(400)
          .json(new InvalidRequest("postId is expected in query param"));
        return;
      }

      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json(new InvalidRequest("bad postId"));
        return;
      }

      const dbResult = await PostLike.find(
        { postId },
        { userId: 1, createdAt: 1 }
      );

      res.status(200).json(new MessageResponse(JSON.stringify(dbResult)));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get("/i-liked", async (req, res, next) => {
    logger.silly(`GET /like/i-liked called`);
    try {
      const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;

      const dbResult = await PostLike.find(
        { userId: loggedInUserId },
        { postId: 1, createdAt: 1 }
      );

      res.status(200).json(new MessageResponse(JSON.stringify(dbResult)));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};

