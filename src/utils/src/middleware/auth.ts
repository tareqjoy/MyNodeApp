// middlewares/authenticate.ts
import { AuthInfo, InternalServerError } from '@tareqjoy/models';
import axios from 'axios';
import { plainToInstance } from 'class-transformer';
import { ATTR_HEADER_USER_ID } from '../constant/constant';
import { Request, Response, NextFunction } from 'express';
import * as log4js from "log4js";

const authVerifyUrl: string = process.env.AUTH_VERIFY_URL || "http://localhost:80/v1/auth/verify/";
const logger = log4js.getLogger();
logger.level = "trace";

export const authorize = async (req: Request, res: Response, next: NextFunction) => {
    logger.trace("calling user service.")

    const accessToken = getAccessTokenFromHeader(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'Authorization header or token is missing' });
    }

    try {
        const response = await axios.post(authVerifyUrl, {}, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status == 200 && response.data) {
            // Attach user claims to the request object for downstream use
            const authInfoResp = plainToInstance(AuthInfo, response.data);

            if(authInfoResp.userId) {
                req.headers[ATTR_HEADER_USER_ID] = authInfoResp.userId;

                logger.debug("successfully verified userId:", authInfoResp.userId);
                return next();
            } else {
                logger.debug("got 200 but authInfoResp.userId is null")
            }
        }

        logger.debug("failed to verify access token");
        return res.status(401).json({ error: 'Invalid or expired token' });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.error(`Error while middleware authZ: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`);
        } else {
            logger.error("Error while middleware authZ: ", error);
        }
        res.status(500).json(new InternalServerError());
        return;
    }
};

const getAccessTokenFromHeader = (req: Request): string | null => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
  
    const token = authHeader.split(' ')[1];
    return token || null;
};