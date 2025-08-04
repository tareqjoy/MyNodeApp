import express from "express";
import { Mongoose, isValidObjectId } from "mongoose";
import { getFileLogger } from "@tareqjoy/utils";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  ProfilePhotoUpdateReq,
} from "@tareqjoy/models";
import { User } from "@tareqjoy/clients";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

const logger = getFileLogger(__filename);

const router = express.Router();

export const createUserInternalRouter = (mongoClient: Mongoose) => {
  router.patch("/:userId/profile-photo", async (req, res, next) => {
    logger.silly(`PATCH /:userId/profile-photo called`);

    const userId: string = req.params.userId;
    if (!isValidObjectId(userId)) {
      res.status(400).json(new InvalidRequest("Invalid userid"));
      return;
    }

    const profilePhotoUpdateReq = plainToInstance(
      ProfilePhotoUpdateReq,
      req.body
    );
    const errors = await validate(profilePhotoUpdateReq);
    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }
    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            profilePhoto: {
              fileName: profilePhotoUpdateReq.fileName,
              uploadedAt: new Date(profilePhotoUpdateReq.uploadedAt),
            },
          },
        },
        { new: true } // return the updated document
      );

      if (!updatedUser) {
        res.status(404).json(new InvalidRequest("username not found"));
        return
      }
      res.status(200).json(new MessageResponse("Profile photo updated"));
    } catch (error) {
      logger.error("Error while /:userId/profile-photo", error);
      res.status(500).json(new InternalServerError());
    }
  });
  return router;
};
