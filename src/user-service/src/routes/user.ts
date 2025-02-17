import express from "express";
import { Mongoose } from "mongoose";
import { UserSchema } from "../schema/user-schema";
import { getFileLogger } from "@tareqjoy/utils";
import {
  InternalServerError,
  InvalidRequest,
  UserDetailsRes,
} from "@tareqjoy/models";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createUserDetailsRouter = (mongoClient: Mongoose) => {
  router.get("/:username", async (req, res, next) => {
    logger.silly(`GET /:username called`);

    const username: string = req.params.username;
    const User = mongoClient.model("User", UserSchema);

    User.findOne({ username: username })
      .exec()
      .then((doc) => {
        if (doc == null) {
          res.status(404).json(new InvalidRequest("username not found"));
        } else {
          res
            .status(200)
            .json(
              new UserDetailsRes(
                String(doc._id),
                doc.username,
                doc.name,
                doc.email,
                doc.birthYear,
              ),
            );
        }
      })
      .catch((err) => {
        logger.error("Error while /:username", err);
        res.status(500).json(new InternalServerError());
      });
  });
  return router;
};
