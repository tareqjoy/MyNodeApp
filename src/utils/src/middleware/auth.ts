// middlewares/authenticate.ts
import { AuthInfo, InternalServerError } from "@tareqjoy/models";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { ATTR_HEADER_USER_ID } from "../constant/constant.js";
import { Request, Response, NextFunction } from "express";
import { getFileLogger } from "../logging/winston.js";
import winston from "winston";

const authVerifyUrl: string =
  process.env.AUTH_VERIFY_URL || "http://localhost:80/v1/auth/verify/";

let logger: winston.Logger = getFileLogger(__filename);

export const authorize = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  logger.debug("calling auth service.");

  const accessToken = getAccessTokenFromHeader(req);
  if (!accessToken) {
    res.status(401).json({
      error: "authorization header missing or bad authorization token",
    });
    return;
  }

  // Authorization header is there
  try {
    const response = await axios.post(
      authVerifyUrl,
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // Attach user claims to the request object for downstream use
    const authInfoResp = plainToInstance(AuthInfo, response.data);

    if (authInfoResp.userId) {
      req.headers[ATTR_HEADER_USER_ID] = authInfoResp.userId;

      logger.debug(`successfully verified userId: ${authInfoResp.userId}`);
      next();
    } else {
      logger.warn("got 200 but authInfoResp.userId is null");
      res.status(500).json(new InternalServerError());
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status == 401) {
        res.status(500).json(error.response?.data);
      } else {
        logger.error(
          `Service error while middleware authZ: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
        );
        res.status(500).json(new InternalServerError());
      }
    } else {
      logger.error("Unexpected error while middleware authZ: ", { error });
      res.status(500).json(new InternalServerError());
    }
  }
};

const getAccessTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  return token || null;
};
