import { getFileLogger } from "@tareqjoy/utils";
import mongoose from "mongoose";
import axios from "axios";
import {
  PostDetailsRes,
  SinglePost,
  UserInternalReq,
  UserInternalRes,
  PostByUserPagingRaw,
  PostByUserPaging,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";

const logger = getFileLogger(__filename);

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
  logger.info(`running this query: ${JSON.stringify(query)}`);
  return query;
}

export async function toResPosts(
  userServiceHostUrl: string,
  dbPosts: any,
  returnOnlyPostId: boolean,
  returnAsUsername: boolean,
  paging?: PostByUserPagingRaw,
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
  if(paging) {
    const pagingJsonString = JSON.stringify(paging);
    const nextPageToken = Buffer.from(pagingJsonString).toString("base64");
    return new PostDetailsRes(resPosts, new PostByUserPaging(nextPageToken));
  } else {
    return new PostDetailsRes(resPosts);
  }
}
