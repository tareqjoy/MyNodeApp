import express from "express";
import { validateAccessToken } from "./common/common";
import { getFileLogger } from "@tareqjoy/utils";

const logger = getFileLogger(__filename);

const router = express.Router();

const ATTR_HEADER_AUTHORIZATION = "authorization";

export const createVerifyRouter = () => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /verify called`);

    const validateRet = validateAccessToken(
      req.headers[ATTR_HEADER_AUTHORIZATION],
    );
    res.status(validateRet.statusCode).json(validateRet.msg);
  });

  return router;
};
