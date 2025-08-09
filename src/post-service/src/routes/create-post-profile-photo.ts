import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import { Producer } from "kafkajs";
import axios from "axios";
import { CreateProfilePhotoPostReq, InternalServerError, MessageResponse } from "@tareqjoy/models";
import { CreatePostReq } from "@tareqjoy/models";
import { Post } from "@tareqjoy/clients";
import { InvalidRequest, NewPostKafkaMsg } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";
import { writePost } from "./common/common";

const logger = getFileLogger(__filename);

const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "new-post";

const router = express.Router();

export const createProfilePhotoRouter = (
  mongoClient: Mongoose,
  newPostKafkaProducer: Producer
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /profile-photo called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    try {
      const createProfilePhotoPostReq = plainToInstance(CreateProfilePhotoPostReq, req.body);
      const errors = await validate(createProfilePhotoPostReq);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }

      await writePost(
        loggedInUserId,
        createProfilePhotoPostReq.body,
        createProfilePhotoPostReq.postTime,
        createProfilePhotoPostReq.attachmentId
          ? [createProfilePhotoPostReq.attachmentId]
          : undefined,
        newPostKafkaProducer,
        kafka_new_post_fanout_topic
      );

      res.status(200).json(new MessageResponse("Posted"));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /create: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
        );
      } else {
        logger.error("Error while /create: ", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
