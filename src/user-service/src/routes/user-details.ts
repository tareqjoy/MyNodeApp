import express from "express";
import { Mongoose, isValidObjectId } from "mongoose";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  ProfilePhoto,
  ProfilePhotoUpdateReq,
  UserDetailsRes,
} from "@tareqjoy/models";
import { User } from "@tareqjoy/clients";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createUserDetailsRouter = (mongoClient: Mongoose) => {
  router.get("/:usernameOrId", async (req, res, next) => {
    logger.silly(`GET /:username called`);

    const { provided } = req.query;

    const usernameOrId: string = req.params.usernameOrId;
    if (provided === "userid" && !isValidObjectId(usernameOrId)) {
      res.status(400).json(new InvalidRequest("Invalid userid"));
      return;
    }

    const query =
      provided === "userid"
        ? { _id: usernameOrId }
        : { username: usernameOrId };

    User.findOne(query)
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
                doc.birthDay.toISOString().split("T")[0],
                doc.gender,
                doc.profilePhoto
                  ? new ProfilePhoto(
                      doc.profilePhoto?.post?.toString() || "",
                      doc.profilePhoto?.attachment?.toString() || ""
                    )
                  : undefined
              )
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
