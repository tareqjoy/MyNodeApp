import express from "express";
import { Driver } from "neo4j-driver";
import { isValidObjectId } from "mongoose";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import { DoIFollowResponse, InternalServerError, InvalidRequest, UserInternalReq, UserInternalRes } from "@tareqjoy/models";
import axios from "axios";
import { plainToInstance } from "class-transformer";

const logger = getFileLogger(__filename);

const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

export const createDoIFollowRouter = (
  neo4jDriver: Driver
) => {
  const router = express.Router();
  router.get("/:usernameOrId", async (req, res, next) => {
    logger.silly(`GET /do-i-follow called`);

    const loggedInUserId = req.headers[ATTR_HEADER_USER_ID] as string;
    const otherUsernameOrId: string = req.params.usernameOrId;

    if(!otherUsernameOrId) {
      res.status(400).json(new InvalidRequest("no userid provided"));
      return;
  }
    
    const { provided } = req.query;

    if(provided === "userid" && !isValidObjectId(otherUsernameOrId)) {
       res.status(400).json(new InvalidRequest("Invalid userid"));
       return;
    }

    let userIdToUse: string;
    if(provided === "username") {
      const userInternalReq = new UserInternalReq(
        [otherUsernameOrId],
        true,
      );
      const userIdResponse = await axios.post(
        userServiceHostUrl,
        userInternalReq,
      );

      const userInternalResponse = plainToInstance(
        UserInternalRes,
        userIdResponse.data,
      );
      userIdToUse=userInternalResponse.toUserIds![otherUsernameOrId];
    } else {
      userIdToUse=otherUsernameOrId;
    }

    const session = neo4jDriver.session();
    try {
      const alreadyFollows = await session.run(
        `
                MATCH (a:User {userId: $userId1})-[r:FOLLOW]->(b:User {userId: $userId2})
                RETURN COUNT(r) > 0 AS exists
                `,
        { userId1: loggedInUserId, userId2: userIdToUse },
      );

      const doIFollow: boolean = alreadyFollows.records[0].get("exists") as boolean;
      res.status(200).json(new DoIFollowResponse(doIFollow));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Error while /do-i-follow: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`,
        );
      } else {
        logger.error("Error while /do-i-follow: ", error);
      }
      res.status(500).json(new InternalServerError());
    } finally {
      await session.close();
    }
  });
  return router;
};
