import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  PhotoUploadKafkaMsg,
  ProfilePhotoRes,
  UserInternalReq,
  UserInternalRes,
} from "@tareqjoy/models";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import multer, { FileFilterCallback } from "multer";
import { Producer } from "kafkajs";
import { PROFILE_PHOTO_VARIANT_SIZES } from "../common/consts";
import { plainToInstance } from "class-transformer";
import mongoose, { Mongoose } from "mongoose";
import { Attachment, VersionType } from "@tareqjoy/clients";
import { metadata } from "reflect-metadata/no-conflict";

const logger = getFileLogger(__filename);

const baseProfilePhotoPath: string =
  process.env.BASE_PROFILE_PHOTO_BASE_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";
const kafka_photo_upload_topic =
  process.env.KAFKA_PHOTO_UPLOAD_TOPIC || "photo-upload";
const userServiceHostUrl: string =
  process.env.USER_SERVICE_USERID_URL ||
  "http://127.0.0.1:5002/v1/user/userid/";

const router = express.Router();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const validateProfilePhotoMid = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.headers[ATTR_HEADER_USER_ID];
  if (!userId || typeof userId !== "string") {
    return res
      .status(400)
      .json(new InvalidRequest(`${ATTR_HEADER_USER_ID} header missing`));
  }
  next();
};

export const createProfilePhotoRouter = (mongoClient: Mongoose) => {
  router.post(
    "/",
    validateProfilePhotoMid,
    (req, res, next) => {
      const userId = req.headers[ATTR_HEADER_USER_ID] as string;
      const userDir = path.join(baseProfilePhotoPath, VersionType.ORIGINAL, userId);

      fs.ensureDirSync(userDir); // Ensure directory exists

      const storage = multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, userDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueName = uuidv4() + ext;
          cb(null, uniqueName);
        },
      });

      const upload = multer({
        storage,
        fileFilter,
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
      }).single("file");

      upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: err.message });
        } else if (err) {
          logger.error(`Error during upload`, err);
          return res.status(500).json(new InternalServerError());
        }
        next(); // proceed to handler
      });
    },
    async (req, res) => {
      if (!req.file) {
        return res
          .status(400)
          .json(new InvalidRequest("No file uploaded or invalid file type"));
      }

      const userId = req.headers[ATTR_HEADER_USER_ID] as string;

      try {
        const savedFilePath = path.resolve(req.file.path);

        const attachment = new Attachment({
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          type: "image",
          uploadedAt: new Date(),
          versions: {
            original: {
              filePath: savedFilePath,
              status: "uploaded",
            },
          },
        });

        await attachment.save();

        if (attachment._id) {
          res
            .status(200)
            .json(new ProfilePhotoRes(attachment?._id?.toString()));
        } else {
          logger.error("Attachment ID is missing after save");
          res.status(500).json(new InternalServerError());
        }
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
    }
  );

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
