import express from "express";
import { Mongoose } from "mongoose";
import { getFileLogger } from "@tareqjoy/utils";
import { InternalServerError, CheckUsernameResponse } from "@tareqjoy/models";
import { User } from "@tareqjoy/clients";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createCheckUsernameRouter = (mongoClient: Mongoose) => {
  router.get("/", async (req, res, next) => {
    logger.silly(`GET /check-username called`);

    const username = req.query.username as string; 
    if (!username) {
       res.status(400).json({ error: "username query parameter is required" });
       return
    }
    if (username.length < 4) {
      res.status(400).json({ error: "username is too short" });
      return
   }

    try {
      const dbUser = await User.findOne(
         { username }
      ).exec();

      res
        .status(200)
        .json(new CheckUsernameResponse(dbUser? false: true));

    } catch (error) {
      logger.error("Error while /check-username", error);
      res.status(500).json(new InternalServerError());
    }
  });

  return router;
};
