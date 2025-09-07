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
import { Attachment, AttachmentStatus, VersionType, AttachmentType } from "@tareqjoy/clients";
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
    logger.silly(`GET /get-attachment is called`);
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

  return router;
};


export const createGetAttachmentRouter = (mongoClient: Mongoose) => {
  router.get("/:attachmentId", async (req, res, next) => {
    logger.silly(`GET /attachment is called`);

    const { attachmentId } = req.params;
    let variant = req.query.variant as string | undefined;

    if (!attachmentId) {
      res.status(400).json(new InvalidRequest("attachmentId is missing"));
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
      res.status(400).json(new InvalidRequest("bad attachmentId"));
      return;
    }

    try {
      const attachmentDoc = await Attachment.findById(attachmentId);
      
      if (!attachmentDoc) {
        res.status(404).json(new InvalidRequest(`Attachment not found`));
        return;
      } 

      if (!variant) {
        if (attachmentDoc.type === "image") {
          variant = VersionType.SMALL;
        } else {
          res.status(400).json(new InvalidRequest("variant is required for type " + attachmentDoc.type));
          return;
        }
      }

      const version = attachmentDoc.versions.get(variant);
      if (!version) {
        res
          .status(404)
          .json(
            new InvalidRequest(`File found but variant "${variant}" not found`)
          );
        return;
      }

      if (version.status !== AttachmentStatus.READY) {
        res.status(423).json(new InvalidRequest("File is not ready yet"));
        return;
      }

      const absolutePath = version.filePath;

      const mimeTypeMap: Record<string, string> = {
        [AttachmentType.IMAGE]: "image/jpeg", 
        [AttachmentType.VIDEO]: "video/mp4",
        [AttachmentType.AUDIO]: "audio/mpeg",
        [AttachmentType.DOCUMENT]: "application/pdf",
      };

      const contentType =
        mimeTypeMap[attachmentDoc.type] || "application/octet-stream";
      
      res.setHeader("Content-Type", contentType);

      const stream = fs.createReadStream(absolutePath);
      stream.pipe(res);

      stream.on("error", (err) => {
        logger.error("error reading file: ", err);
        res.status(500).json(new InternalServerError());
        return;
      });

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

  return router;
};
