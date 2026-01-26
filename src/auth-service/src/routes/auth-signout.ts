import express from "express";
import { plainToInstance } from "class-transformer";
import { AuthInfo, AuthSignoutReq, MessageResponse } from "@tareqjoy/models";
import { InternalServerError, InvalidRequest } from "@tareqjoy/models";
import { RedisClientType } from "redis";
import { validate } from "class-validator";
import { validateAccessToken } from "./common/common";
import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const router = express.Router();

const ATTR_HEADER_DEVICE_ID = "device-id";
const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createSignOutRouter = (
  redisClient: RedisClientType<any, any, any, any>,
) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /signout called`);

    const authHeader = req.headers[ATTR_HEADER_AUTHORIZATION];
    if (!authHeader || typeof authHeader !== "string") {
      res
        .status(400)
        .json(
          new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`),
        );
      return;
    }

    const authSignOutObj = plainToInstance(AuthSignoutReq, req.body);
    const errors = await validate(authSignOutObj);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

    if (
      !authSignOutObj.allDevices &&
      (!deviceId || typeof deviceId !== "string")
    ) {
      res
        .status(400)
        .json(
          new InvalidRequest(
            `Header ${ATTR_HEADER_DEVICE_ID} is required or allDevices set to true in body`,
          ),
        );
      return;
    }

    try {
      const validateRet = validateAccessToken(authHeader);

      if (validateRet.statusCode == 200) {
        const authInfo = validateRet.msg as AuthInfo;

        let deviceIdField = deviceId as string;
        if (authSignOutObj.allDevices) {
          deviceIdField = "*";
        }
       
        const redisKey = `refresh-token:${authInfo.userId}:${deviceIdField}`;
        logger.debug(`logging out, redis-key: ${redisKey}`);
        const signOutCount = await redisClient.del(redisKey);

        res
          .status(200)
          .json(new MessageResponse(`Logged out from ${signOutCount} devices`));
      } else {
        res.status(validateRet.statusCode).json(validateRet.msg);
      }
    } catch (error) {
      logger.error("Error while /signout", error);
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
