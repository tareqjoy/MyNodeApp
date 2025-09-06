import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import {
  AttachmentInfos,
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  PhotoUploadKafkaMsg,
  ProfilePhotoRes,
  SingleAttachmentInfo,
  UserInternalReq,
  UserInternalRes,
  VersionInfo,
} from "@tareqjoy/models";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import multer, { FileFilterCallback } from "multer";
import { Producer } from "kafkajs";
import { PROFILE_PHOTO_VARIANT_SIZES } from "../common/consts";
import { plainToInstance } from "class-transformer";
import mongoose, { Mongoose, Types } from "mongoose";
import { Attachment } from "@tareqjoy/clients";
import { metadata } from "reflect-metadata/no-conflict";

const logger = getFileLogger(__filename);

const baseProfilePhotoPath: string =
  process.env.BASE_PROFILE_PHOTO_BASE_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";
const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

function validateObjectIds(ids: unknown): string[] {
  let idList: unknown[] = [];

  if (typeof ids === "string") {
    idList = [ids];
  } else if (Array.isArray(ids)) {
    idList = ids;
  } else {
    throw new Error("ids must be a string or an array of strings");
  }

  const validIds: string[] = [];

  for (const id of idList) {
    if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    validIds.push(id);
  }

  return validIds;
}

export const createInternalGetAttachmentRouter = (mongoClient: Mongoose) => {
  router.get("/", async (req, res, next) => {
    logger.silly(`POST /get-attachment is called`);
    let validated: string[] = [];
    try {
      const idsParam = req.query.ids as string | undefined;
      if (!idsParam) {
        return res.status(400).json({ error: "ids query param is required" });
      }

      const ids = idsParam.includes(",") ? idsParam.split(",") : idsParam;
      validated = validateObjectIds(ids);
    } catch (error: any) {
      res.status(400).json(new InvalidRequest(error.message));
      return;
    }

    try {
      const attachmentIds = validated.map((id) => new Types.ObjectId(id));
      const dbAttachments = await Attachment.find({
        _id: { $in: attachmentIds },
      });

      const attachmentsDto = dbAttachments.map((attachment) => {
        const versionsObj: Record<string, VersionInfo> = {};
        for (const [name, v] of attachment.versions.entries()) {
          versionsObj[name] = new VersionInfo(v.filePath, v.status, {
            manifestUrl: v.manifestUrl || undefined,
            metadata:
              v.metadata && Object.keys(v.metadata).length > 0
                ? Object.fromEntries(
                    Object.entries(v.metadata).map(([k, val]) => [
                      k,
                      val === null ? undefined : val,
                    ])
                  )
                : undefined,
          });
        }

        return new SingleAttachmentInfo(
          attachment._id.toString(),
          attachment.userId.toString(),
          attachment.type,
          attachment.uploadedAt,
          attachment.updatedAt,
          versionsObj
        );
      });

      res.status(200).json(new AttachmentInfos(attachmentsDto));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `Axios error in upload: url=${error.config?.url}, status=${error.response?.status}, message=${JSON.stringify(error.response?.data)}`
        );
      } else {
        logger.error("Unhandled error in upload:", error);
      }
      res.status(500).json(new InternalServerError());
    }
  });

  router.get(
    "/:userId/:variant/:fileName",
    async (req: Request, res: Response) => {
      const { userId, variant, fileName } = req.params;

      if (!userId || !variant || !fileName) {
        res
          .status(400)
          .json(
            new InvalidRequest(
              "Missing parameters, accepted: <>/userId/variant/fileName"
            )
          );
        return;
      }

      if (!Object.keys(PROFILE_PHOTO_VARIANT_SIZES).includes(variant)) {
        res.status(400).json(new InvalidRequest(`Invalid variant: ${variant}`));
        return;
      }

      try {
        const resultUserInternalReq = new UserInternalReq(userId, false);

        const resultUserAxiosRes = await axios.post(
          userServiceHostUrl,
          resultUserInternalReq
        );
        const resultUserResObj = plainToInstance(
          UserInternalRes,
          resultUserAxiosRes.data
        );

        if (
          resultUserResObj.toUsernames &&
          userId in resultUserResObj.toUsernames &&
          resultUserResObj.toUsernames[userId]
        ) {
          const photoPath = path.join(
            baseProfilePhotoPath,
            variant,
            userId,
            fileName
          );

          const photoBuffer = await fs.readFile(photoPath);
          res.setHeader("Content-Type", "image/jpeg");
          res.send(photoBuffer);
        } else {
          res.status(400).json(new InvalidRequest(`Invalid userId: ${userId}`));
          return;
        }
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          logger.error(
            `Error while /:userId/:variant/:fileName: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
          );
          if (
            error.response?.status === 404 ||
            error.response?.status === 400
          ) {
            res
              .status(400)
              .json(new InvalidRequest(`Invalid userId: ${userId}`));
          } else {
            res.status(500).json(new InternalServerError());
          }
        } else {
          const code = error.code;
          if (code === "ENOENT") {
            // File or directory doesn't exist
            res.status(404).json(new InvalidRequest(`Invalid fileName`));
          }
        }
      }
    }
  );

  return router;
};
