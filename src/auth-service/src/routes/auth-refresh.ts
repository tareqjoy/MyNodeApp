import express from "express";
import { AuthInfo, AuthRefreshReq, AuthRefreshRes } from "@tareqjoy/models";
import { InvalidRequest, UnauthorizedRequest } from "@tareqjoy/models";
import { RedisClientType } from "redis";
import jwt from "jsonwebtoken";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  genAccessRefreshToken,
  getRefreshCookieClearOptions,
  getRefreshCookieOptions,
  jwt_access_expires_sec,
  jwt_refresh_secret,
  refresh_cookie_name,
} from "./common/common";
import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const router = express.Router();

const ATTR_HEADER_DEVICE_ID = "device-id";
const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createRefreshRouter = (
  redisClient: RedisClientType<any, any, any, any>,
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /refresh called`);

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

    const refreshToken =
      (req.cookies && req.cookies[refresh_cookie_name]) ||
      authSRefreshObj.refresh_token;

    if (!refreshToken) {
      res.clearCookie(refresh_cookie_name, getRefreshCookieClearOptions());
      res.status(400).json(new InvalidRequest("Refresh token missing"));
      return;
    }

    let refreshAuthInfo;
    try {
      refreshAuthInfo = jwt.verify(
        refreshToken,
        jwt_refresh_secret,
      ) as AuthInfo;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "TokenExpiredError") {
          res.clearCookie(
            refresh_cookie_name,
            getRefreshCookieClearOptions(),
          );
          res.status(401).json(new UnauthorizedRequest("Access token expired"));
          return;
        }
      }
      res.clearCookie(refresh_cookie_name, getRefreshCookieClearOptions());
      res.status(400).json(new InvalidRequest(`Invalid refresh token`));
      return;
    }

    const redisKey = `refresh-token:${refreshAuthInfo.userId}:${clientOrDeviceId}`;
    const redisRefreshToken = await redisClient.get(redisKey);

    if (!redisRefreshToken || redisRefreshToken !== refreshToken) {
      res.clearCookie(refresh_cookie_name, getRefreshCookieClearOptions());
      res.status(403).json(new UnauthorizedRequest());
      return;
    }

    const authResp = await genAccessRefreshToken(
      redisClient,
      refreshAuthInfo.userId,
      clientOrDeviceId,
    );
    res.cookie(
      refresh_cookie_name,
      authResp.refresh_token,
      getRefreshCookieOptions(),
    );
    authResp.refresh_token = "";
    res
      .status(200)
      .json(new AuthRefreshRes(authResp.access_token, jwt_access_expires_sec));
  });

  return router;
};
