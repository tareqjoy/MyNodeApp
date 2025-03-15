import express from "express";
import { Driver } from "neo4j-driver";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import { DoIFollowResponse, InternalServerError, InvalidRequest } from "@tareqjoy/models";
import axios from "axios";

const logger = getFileLogger(__filename);

const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

export const createDoIFollowRouter = (
  neo4jDriver: Driver
) => {
  const router = express.Router();
  router.get("/:userId", async (req, res, next) => {
    logger.silly(`GET /do-i-follow called`);

    const loggedInUserId = req.headers[ATTR_HEADER_USER_ID] as string;
    const otherUserId: string = req.params.userId;

    if(!otherUserId) {
        res.status(400).json(new InvalidRequest("no userid provided"));
        return;
    }

    const session = neo4jDriver.session();
    try {
      const doIFollowQuery = `
          MATCH (me:User {userId: $myUserId})-[:FOLLOW]->(otherUser:User {userId: $otherUserId})
          RETURN COUNT(otherUser) > 0 AS isFollowing
            `;
      const session = neo4jDriver.session();

      const isFollowingObj = await session.run(doIFollowQuery, { myUserId: loggedInUserId, otherUserId: otherUserId });
      
      const doIFollow: boolean = isFollowingObj.records[0].get("isFollowing");
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
