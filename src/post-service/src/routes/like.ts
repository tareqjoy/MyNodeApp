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
  UserInternalReq,
  UserInternalRes,
  UserLike,
  WhoLikedPagingRaw,
  WhoLikedRes,
} from "@tareqjoy/models";
import { InvalidRequest } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";
import { RedisClientType } from "redis";
import { PostLike } from "@tareqjoy/clients";
import { addPaginationToQuery, getPostLikeCount } from "./common/common";

const logger = getFileLogger(__filename);

const kafka_post_like_fanout_topic =
  process.env.KAFKA_NEW_POST_LIKE_TOPIC || "post-like";
const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

export const createLikeRouter = (
  mongoClient: Mongoose,
  redisClient: RedisClientType<any, any, any, any>,
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
          `Error while /like: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /like: ", error);
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
          `Error while /like/count: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /like/count: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get("/like/who", async (req, res, next) => {
    logger.silly(`GET /like/who called`);

    const returnLimit = 50;

    try {
      const postId = req.query.postId as string;
      const nextToken = req.query.nextToken as string;

      if (!postId) {
        res
          .status(400)
          .json(new InvalidRequest("postId is expected in query param"));
        return;
      }

      let pagingRaw: WhoLikedPagingRaw | undefined = undefined;
      if (nextToken) {
        try {
          const rawPagingJson = JSON.parse(
            Buffer.from(nextToken, "base64").toString("utf-8"),
          );
          pagingRaw = plainToInstance(WhoLikedPagingRaw, rawPagingJson);
        } catch (error) {
          res.status(400).json(new InvalidRequest("Invalid nextToken"));
          return;
        }
      }

      if (!mongoose.isValidObjectId(postId)) {
        res.status(400).json(new InvalidRequest("bad postId"));
        return;
      }

      var query: any = {
        postId: new mongoose.Types.ObjectId(postId),
      };

      const dbResult = await PostLike.find(
        addPaginationToQuery(
          query,
          pagingRaw?.lastPostTime,
          pagingRaw?.lastPostId,
          "createdAt",
        ),
        { userId: 1, createdAt: 1, likeType: 1 },
      )
        .sort({ createdAt: -1, userId: -1 })
        .limit(returnLimit);

      const userIds: string[] = dbResult.map((postLike) =>
        postLike.userId.toString(),
      );

      const userInternalReq = new UserInternalReq(userIds, false);
      const usernameAxiosResponse = await axios.post(
        userServiceHostUrl,
        userInternalReq,
      );

      const userInternalResponse = plainToInstance(
        UserInternalRes,
        usernameAxiosResponse.data,
      );
      const useridToName = userInternalResponse.toUsernames!;

      const userLikes: UserLike[] = dbResult
        .filter((postLike) => postLike.userId.toString() in useridToName)
        .map(
          (postLike) =>
            new UserLike(postLike.likeType, {
              username: useridToName[postLike.userId.toString()],
            }),
        );

      if (dbResult.length < returnLimit || dbResult.length == 0) {
        res.status(200).json(new WhoLikedRes(userLikes));
      } else {
        const lastRow = dbResult[dbResult.length - 1];
        let pagingRawForReturn: WhoLikedPagingRaw = new WhoLikedPagingRaw(
          lastRow.createdAt,
          lastRow.userId.toString(),
        );
        const pagingJsonString = JSON.stringify(pagingRawForReturn);
        const nextPageToken = Buffer.from(pagingJsonString).toString("base64");
        res.status(200).json(new WhoLikedRes(userLikes, nextPageToken));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /like/who: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /like/who: ", error);
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
          `Error while /i-liked: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`,
        );
      } else {
        logger.error("Error while /i-liked: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
