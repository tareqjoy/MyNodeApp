import * as log4js from "log4js";
import mongoose from "mongoose";
import axios from "axios";
import {
  PostDetailsRes,
  SinglePost,
  UserInternalReq,
  UserInternalRes,
  Paging,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";

const logger = log4js.getLogger();
logger.level = "trace";

export function getTimeSortedGetPostIdsByUserListQuery(
  userMongoIds: mongoose.Types.ObjectId[],
  highTime: number,
  lastPostId?: string,
): any {
  var query: any = {
    userid: { $in: userMongoIds },
  };

  if (lastPostId) {
    query = {
      ...query,
      $or: [
        { time: { $lt: highTime } },
        { time: highTime, _id: { $lt: lastPostId } },
      ],
    };
  } else {
    query = {
      ...query,
      time: { $lte: highTime },
    };
  }
  logger.info(query);
  return query;
}

export async function toResPosts(
  userServiceHostUrl: string,
  dbPosts: any,
  returnOnlyPostId: boolean,
  returnAsUsername: boolean,
  paging?: Paging,
): Promise<PostDetailsRes> {
  const resPosts: SinglePost[] = [];
  if (returnOnlyPostId) {
    for (const dbp of dbPosts) {
      resPosts.push(new SinglePost(dbp.id, dbp.time));
    }
  } else {
    if (returnAsUsername) {
      const pUserIds: string[] = [];

      for (const dbp of dbPosts) {
        pUserIds.push(dbp.userid!.toString());
      }

      const pUserInternalReq = new UserInternalReq(pUserIds, false);
      const pUserIdAxiosResponse = await axios.post(
        userServiceHostUrl,
        pUserInternalReq,
      );

      const pUserResObj = plainToInstance(
        UserInternalRes,
        pUserIdAxiosResponse.data,
      );

      for (const dbp of dbPosts) {
        resPosts.push(
          new SinglePost(dbp.id, dbp.time, {
            userIdOrUsername: pUserResObj.toUsernames![dbp.userid?.toString()],
            isUserName: true,
            body: dbp.body,
          }),
        );
      }
    } else {
      for (const dbp of dbPosts) {
        resPosts.push(
          new SinglePost(dbp.id, dbp.time, {
            userIdOrUsername: dbp.userid?.toString(),
            isUserName: false,
            body: dbp.body,
          }),
        );
      }
    }
  }
  return new PostDetailsRes(resPosts, paging);
}
