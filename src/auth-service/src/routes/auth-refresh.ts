import express from "express";
import * as log4js from "log4js";
import { AuthInfo, AuthRefreshReq, AuthRefreshRes } from "@tareqjoy/models";
import { InvalidRequest, UnauthorizedRequest } from "@tareqjoy/models";
import { RedisClientType } from "redis";
import jwt from "jsonwebtoken";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  jwt_access_expires_sec,
  jwt_access_secret,
  jwt_refresh_secret,
} from "./common/common";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const ATTR_HEADER_DEVICE_ID = "device-id";
const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createRefreshRouter = (
  redisClient: RedisClientType<any, any, any>,
) => {
  router.post("/", async (req, res, next) => {
    logger.trace(`POST /refresh called`);

    let clientOrDeviceId: string;
    if (
      req.headers[ATTR_HEADER_DEVICE_ID] &&
      typeof req.headers[ATTR_HEADER_DEVICE_ID] === "string"
    ) {
      clientOrDeviceId = req.headers[ATTR_HEADER_DEVICE_ID];
    } else if (
      req.headers[ATTR_HEADER_AUTHORIZATION] &&
      typeof req.headers[ATTR_HEADER_AUTHORIZATION] === "string"
    ) {
      const base64str = req.headers[ATTR_HEADER_AUTHORIZATION].split(" ")[1];
      const clientIdSecret = Buffer.from(base64str, "base64").toString("utf-8");
      clientOrDeviceId = clientIdSecret.split(":")[0];
    } else {
      res
        .status(400)
        .json(
          new InvalidRequest(
            `Header ${ATTR_HEADER_DEVICE_ID} or Header ${ATTR_HEADER_AUTHORIZATION} Basic <base64> client_id:secret is required`,
          ),
        );
      return;
    }

    const authSRefreshObj = plainToInstance(AuthRefreshReq, req.body);
    const errors = await validate(authSRefreshObj);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    let refreshAuthInfo;
    try {
      refreshAuthInfo = jwt.verify(
        authSRefreshObj.refresh_token,
        jwt_refresh_secret,
      ) as AuthInfo;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "TokenExpiredError") {
          res.status(401).json(new UnauthorizedRequest("Access token expired"));
          return;
        }
      }
      res.status(400).json(new InvalidRequest(`Invalid refresh token`));
      return;
    }

    const redisKey = `refresh-token:${refreshAuthInfo.userId}:${clientOrDeviceId}`;
    const redisRefreshToken = await redisClient.get(redisKey);

    if (
      !redisRefreshToken ||
      redisRefreshToken !== authSRefreshObj.refresh_token
    ) {
      res.status(403).json(new UnauthorizedRequest());
      return;
    }

    const authInfo = new AuthInfo(refreshAuthInfo.userId);
    const newAccessToken = jwt.sign({ ...authInfo }, jwt_access_secret, {
      expiresIn: jwt_access_expires_sec,
    });

    res
      .status(200)
      .json(new AuthRefreshRes(newAccessToken, jwt_access_expires_sec));
  });

  return router;
};
