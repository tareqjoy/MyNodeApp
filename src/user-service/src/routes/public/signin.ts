import express from "express";
import { Mongoose } from "mongoose";
import { getFileLogger } from "@tareqjoy/utils";
import { plainToInstance } from "class-transformer";
import { UserSignInReq, UserSignInRes } from "@tareqjoy/models";
import { InternalServerError, InvalidRequest } from "@tareqjoy/models";
import { User } from "@tareqjoy/clients";
import { validate } from "class-validator";
import argon2 from "argon2";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createSignInRouter = (mongoClient: Mongoose) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST / called`);

    const signInObj = plainToInstance(UserSignInReq, req.body);
    const errors = await validate(signInObj);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    try {

      const dbUser = await User.findOne(
        { $or: [{ username: signInObj.username }, { email: signInObj.email }] },
        { username: 1, id: 1, password: 1 },
      ).exec();

      if (!dbUser) {
        res
          .status(404)
          .json(new InvalidRequest("username or email doesn't exist"));
        return;
      }

      if (
        dbUser.password &&
        !(await argon2.verify(dbUser.password, signInObj.password))
      ) {
        res.status(403).json(new InvalidRequest("wrong password"));
        return;
      }
      const userInfo = new UserSignInRes(dbUser.id.toString(), dbUser.username);
      res.status(200).json(userInfo);
    } catch (error) {
      logger.error("Error while /signin", error);
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
