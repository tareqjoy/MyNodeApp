import express from "express";
import mongoose, { Mongoose } from "mongoose";
import { getFileLogger } from "@tareqjoy/utils";
import { plainToInstance } from "class-transformer";
import { SignUpReq, User } from "@tareqjoy/models";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
} from "@tareqjoy/models";
import { validate } from "class-validator";
import argon2 from "argon2";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createSignUpRouter = (mongoClient: Mongoose) => {
  router.get("/:", (req, res, next) => {
    res.status(200).json({
      message: "Handling GET request to /signup",
    });
  });

  router.post("/", async (req, res, next) => {
    logger.silly(`POST / called`);

    const signUpDto = plainToInstance(SignUpReq, req.body);
    const errors = await validate(signUpDto);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    const existUser = await User.findOne({
      $or: [{ username: signUpDto.username }, { email: signUpDto.email }],
    }).exec();

    if (existUser) {
      let existsParam: string = "";
      if(existUser.username === signUpDto.username && existUser.email === signUpDto.email) {
        existsParam = "both username & email";
      } else if(existUser.username === signUpDto.username ) {
        existsParam = "username";
      } else if(existUser.email === signUpDto.email ) {
        existsParam = "email";
      }
      res
        .status(400)
        .json(new InvalidRequest(`${existsParam} already exists`));
      return;
    }

    const hashedPass = await argon2.hash(signUpDto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 4,
      parallelism: 2,
    });

    const user = new User({
      _id: new mongoose.Types.ObjectId(),
      username: signUpDto.username,
      email: signUpDto.email,
      password: hashedPass,
      name: signUpDto.name,
      birthDay: new Date(signUpDto.birthDay),
      gender: signUpDto.gender,
    });

    user
      .save()
      .then((result) => {
        res.status(200).json(new MessageResponse("Signed up"));
      })
      .catch((err) => {
        logger.error("Error while /signup", err);
        res.status(500).json(new InternalServerError());
      });
  });

  return router;
};
