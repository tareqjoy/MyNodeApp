import {
  AuthInfo,
  AuthSignInRes,
  InvalidRequest,
  UnauthorizedRequest,
} from "@tareqjoy/models";
import jwt from "jsonwebtoken";
import { RedisClientType } from "redis";

export const jwt_access_secret =
  process.env.JWT_ACCESS_SECRET || "test_access_secret_key_00x";
export const jwt_access_expires_sec = Number(
  process.env.JWT_ACCESS_EXPIRES_SEC || "900",
); //15min
export const jwt_refresh_secret =
  process.env.JWT_REFRESH_SECRET || "test_refresh_secret_key_00x";
export const jwt_refresh_expires_sec = Number(
  process.env.JWT_REFRESH_EXPIRES_SEC || "1296000",
); //15days

const ATTR_HEADER_AUTHORIZATION = "authorization";

class ValidateResponse {
  statusCode: number;
  msg: AuthInfo | UnauthorizedRequest | InvalidRequest;

  constructor(
    statusCode: number,
    msg: AuthInfo | UnauthorizedRequest | InvalidRequest,
  ) {
    this.statusCode = statusCode;
    this.msg = msg;
  }
}

export function validateAccessToken(authHeader: any): ValidateResponse {
  if (!authHeader || typeof authHeader !== "string") {
    return new ValidateResponse(
      400,
      new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`),
    );
  }

  const accessToken = authHeader && authHeader.split(" ")[1];

  if (!accessToken) {
    return new ValidateResponse(
      400,
      new InvalidRequest(`Access token missing`),
    );
  }
  try {
    const authInfo = jwt.verify(accessToken, jwt_access_secret) as AuthInfo;
    return new ValidateResponse(200, authInfo);
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TokenExpiredError") {
        return new ValidateResponse(
          401,
          new UnauthorizedRequest("Access token expired"),
        );
      }
    }
    return new ValidateResponse(
      401,
      new UnauthorizedRequest(`Invalid access token`),
    );
  }
}

export async function genAccessRefreshToken(
  redisClient: RedisClientType<any, any, any>,
  userId: string,
  deviceId: string,
): Promise<AuthSignInRes> {
  const authInfo = new AuthInfo(userId);
  const accessToken = jwt.sign({ ...authInfo }, jwt_access_secret, {
    expiresIn: jwt_access_expires_sec,
  });
  const refreshToken = jwt.sign({ ...authInfo }, jwt_refresh_secret, {
    expiresIn: jwt_refresh_expires_sec,
  });

  const redisKey = `refresh-token:${userId}:${deviceId}`;
  await redisClient.set(redisKey, refreshToken, {
    EX: jwt_refresh_expires_sec,
  });

  return new AuthSignInRes(accessToken, refreshToken, jwt_access_expires_sec);
}
