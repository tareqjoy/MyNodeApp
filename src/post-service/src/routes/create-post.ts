import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import mongoose, { Mongoose } from "mongoose";
import { Producer } from "kafkajs";
import axios from "axios";
import {
  InternalServerError,
  MessageResponse
} from "@tareqjoy/models";
import { CreatePostReq } from "@tareqjoy/models";
import { Post } from "@tareqjoy/clients";
import { InvalidRequest, NewPostKafkaMsg } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "new-post";

const router = express.Router();

export const createCreateRouter = (
  mongoClient: Mongoose,
  newPostKafkaProducer: Producer,
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /create called`);
    const loggedInUserId: string = req.headers[ATTR_HEADER_USER_ID] as string;
    try {
      const createPostReq = plainToInstance(CreatePostReq, req.body);
      const errors = await validate(createPostReq);

      if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
      }

      const post = new Post({
        _id: new mongoose.Types.ObjectId(),
        userId: loggedInUserId,
        body: createPostReq.body,
        time: createPostReq.postTime,
      });

      const dbResult = await post.save();
      logger.debug(`saved to mongodb with postId: ${dbResult.id}`);

      const kafkaMsg = new NewPostKafkaMsg(
        dbResult.id,
        dbResult.userId!.toString(),
        dbResult.time,
      );
      logger.debug(`publishing Kafka: topic: ${kafka_new_post_fanout_topic}`);
      await newPostKafkaProducer.send({
        topic: kafka_new_post_fanout_topic,
        messages: [
          {
            key: dbResult.id,
            value: JSON.stringify(kafkaMsg),
          },
        ],
      });

      res.status(200).json(new MessageResponse("Posted"));
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
