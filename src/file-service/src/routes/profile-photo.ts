import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  PhotoUploadKafkaMsg,
} from "@tareqjoy/models";
import { ATTR_HEADER_USER_ID, getFileLogger } from "@tareqjoy/utils";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import multer, { FileFilterCallback } from "multer";
import { Producer } from "kafkajs";

const logger = getFileLogger(__filename);

const baseProfilePhotoPath: string =
  process.env.BASE_PROFILE_PHOTO_BASE_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";
const kafka_photo_upload_topic =
  process.env.KAFKA_PHOTO_UPLOAD_TOPIC || "photo-upload";

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

export const createProfilePhotoRouter = (kafkaProducer: Producer) => {
  router.post(
    "/",
    validateProfilePhotoMid,
    (req, res, next) => {
      const userId = req.headers[ATTR_HEADER_USER_ID] as string;
      const userDir = path.join(baseProfilePhotoPath, "original", userId);

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
        const kafkaMsg = new PhotoUploadKafkaMsg(req.file.filename, { userId });

        const kafkaResp = await kafkaProducer.send({
          topic: kafka_photo_upload_topic,
          messages: [
            {
              key: req.file.filename,
              value: JSON.stringify(kafkaMsg),
            },
          ],
        });

        logger.debug(`Kafka response: ${JSON.stringify(kafkaResp)}`);
        res.status(200).json(new MessageResponse("File uploaded successfully"));
      } catch (error) {
        if (axios.isAxiosError(error)) {
          logger.error(
            `Axios error in upload: url=${error.config?.url}, status=${error.response?.status}, message=${error.message}`
          );
        } else {
          logger.error("Unhandled error in upload:", error);
        }
        res.status(500).json(new InternalServerError());
      }
    }
  );

  return router;
};
