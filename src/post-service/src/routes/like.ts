import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import { MongoServerError } from "mongodb";
import { Producer } from "kafkajs";
import axios from "axios";
import {
  InternalServerError,
  LikeReq,
  MessageResponse
} from "@tareqjoy/models";
import { CreatePostReq } from "@tareqjoy/models";
import { InvalidRequest, NewPostKafkaMsg } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";
import { PostLikeSchema } from "../db/PostLikeSchema";

const logger = getFileLogger(__filename);

const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "new-post";

const router = express.Router();

export const createLikeRouter = (
  mongoClient: Mongoose
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /like called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    try {
      const likeReq = plainToInstance(LikeReq, req.body);
      const errors = await validate(likeReq);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }

      const PostLike = mongoClient.model("PostLike", PostLikeSchema);

      const postLikeObj = new PostLike({
        userId: loggedInUserId,
        postId: likeReq.postId,
        likeType: likeReq.reactType,
        createdAt: likeReq.reactTime
      });

      const dbResult = await postLikeObj.save();
      logger.debug(`saved to mongodb with postId: ${dbResult.id}`);

      res.status(200).json(new MessageResponse("Liked"));
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        res.status(400).json(new MessageResponse("Already liked"));
        return;
      } else if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get("/", async (req, res, next) => {
    logger.silly(`GET /like called`);
    
    try {

      const { postId } = req.query;

      if(!postId) {
        res.status(400).json(new InvalidRequest("postId is expected in query param"));
        return;
      }

      if(!mongoose.isValidObjectId(postId)) {
        res.status(400).json(new InvalidRequest("bad postId"));
        return;
      }

      const PostLike = mongoClient.model("PostLike", PostLikeSchema);

      const dbResult = await PostLike.find({postId}, {  userId: 1, createdAt: 1 });

      res.status(200).json(new MessageResponse(JSON.stringify(dbResult)));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
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


      const PostLike = mongoClient.model("PostLike", PostLikeSchema);

      const dbResult = await PostLike.find({userId: loggedInUserId}, {  postId: 1, createdAt: 1 });

      res.status(200).json(new MessageResponse(JSON.stringify(dbResult)));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
