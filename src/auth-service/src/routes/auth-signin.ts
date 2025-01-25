import express from "express";
import * as log4js from "log4js";
import { plainToInstance } from "class-transformer";
import {
  AuthSignInReq,
  AuthSignInRes,
  AuthInfo,
  UserSignInReq,
  UserSignInRes,
} from "@tareqjoy/models";
import {
  InternalServerError,
  InvalidRequest,
  UnauthorizedRequest,
} from "@tareqjoy/models";
import { RedisClientType } from "redis";
import { validate } from "class-validator";
import jwt from "jsonwebtoken";
import axios, { AxiosError } from "axios";
import { genAccessRefreshToken } from "./common/common";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const ATTR_HEADER_DEVICE_ID = "device-id";

const userSignInUrl: string =
  process.env.USER_SERVICE_SIGN_IN_URL ||
  "http://127.0.0.1:5002/v1/user/signin/";

export const createSignInRouter = (
  redisClient: RedisClientType<any, any, any>,
) => {
  router.post("/", async (req, res, next) => {
    logger.trace(`POST /signin called`);

    const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

    if (!deviceId || typeof deviceId !== "string") {
      res
        .status(400)
        .json(
          new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required`),
        );
      return;
    }

    const authSignInObj = plainToInstance(AuthSignInReq, req.body);
    const errors = await validate(authSignInObj);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    try {
      const userSignInReq = new UserSignInReq(
        { username: authSignInObj.username, email: authSignInObj.email },
        authSignInObj.password,
      );
      const userSignInRes = await axios.post(userSignInUrl, userSignInReq);
      const userSignInResObj = plainToInstance(
        UserSignInRes,
        userSignInRes.data,
      );

      const authResp = await genAccessRefreshToken(
        redisClient,
        userSignInResObj.userId,
        deviceId,
      );

      res.status(200).json(authResp);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status == 401) {
          res.status(401).json(new UnauthorizedRequest(error.response.data));
        } else {
          logger.error(
            `Error while /auth-signin: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
          );
          res.status(500).json(new InternalServerError());
        }
      } else {
        logger.error("Error while /auth-signin", error);
        res.status(500).json(new InternalServerError());
      }
    }
  });

  return router;
};
