import { Session } from "neo4j-driver";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { Request, Response } from "express";
import * as log4js from "log4js";
import {
  FollowersReq,
  FollowersReqInternal,
  UserInternalReq,
  UserInternalRes,
} from "@tareqjoy/models";
import { FollowersRes } from "@tareqjoy/models";
import { InvalidRequest } from "@tareqjoy/models";
import axios from "axios";
import { ATTR_HEADER_USER_ID } from "@tareqjoy/utils";

export async function parseAndExecuteQuery(
  isInternalEndpoint: boolean,
  userServiceHostUrl: string,
  req: Request,
  res: Response,
  neo4jSession: Session,
  query: string,
) {
  let loggedInUserId: string = "";
  let returnAsUsername: boolean = false;
  if (isInternalEndpoint) {
    const followersDto = plainToInstance(FollowersReqInternal, req.body);
    const errors = await validate(followersDto);

    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    loggedInUserId = followersDto.userId;
    returnAsUsername = followersDto.returnAsUsername;
  } else {
    loggedInUserId = req.headers[ATTR_HEADER_USER_ID] as string;

    const followersDto = plainToInstance(FollowersReq, req.body);
    const errors = await validate(followersDto);

    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    returnAsUsername = followersDto.returnAsUsername;
  }

  const followers = await neo4jSession.run(query, { userId: loggedInUserId });

  const whoFollows = [];

  for (const record of followers.records) {
    whoFollows.push(record.get("fuser").properties.userId);
  }

  if (returnAsUsername) {
    const resultUserInternalReq = new UserInternalReq(whoFollows, false);

    const resultUserAxiosRes = await axios.post(
      userServiceHostUrl,
      resultUserInternalReq,
    );
    const resultUserResObj = plainToInstance(
      UserInternalRes,
      resultUserAxiosRes.data,
    );

    const usernames = [];
    for (const key in resultUserResObj.toUsernames) {
      usernames.push(resultUserResObj.toUsernames[key]);
    }

    res.status(200).json(new FollowersRes(usernames, true));
  } else {
    res.status(200).json(new FollowersRes(whoFollows, false));
  }
}
