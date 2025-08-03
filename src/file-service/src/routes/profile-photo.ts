import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import {
  InternalServerError,
  InvalidRequest,
  MessageResponse,
  ProfilePhotoReq,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ATTR_HEADER_USER_ID,
  getInternalFullPath,
  getFileLogger,
} from "@tareqjoy/utils";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import multer, { FileFilterCallback } from "multer";

const logger = getFileLogger(__filename);

const baseProfilePhotoPath: string =
  process.env.BASE_PROFILE_PHOTO_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";

const router = express.Router();

fs.ensureDirSync(baseProfilePhotoPath);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, baseProfilePhotoPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = uuidv4() + ext;
    cb(null, uniqueName);
  },
});

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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
});
const validateProfilePhotoMid = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.headers || !req.headers[ATTR_HEADER_USER_ID]) {
    res
      .status(400)
      .json(new InvalidRequest(`$${ATTR_HEADER_USER_ID} header missing`));
  }

  next();
};

export const createProfilePhotoRouter = () => {
  router.post(
    "/",
    validateProfilePhotoMid,
    (req, res, next) => {
      upload.single("file")(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: err.message });
        } else if (err) {
          logger.error(
            `Error while upload`, err
          );
          return res
            .status(500)
            .json(new InternalServerError());
        }
        next(); // go to actual handler
      });
    },
    async (req, res, next) => {
      if (!req.file)
        return res
          .status(400)
          .json(new InvalidRequest("No file uploaded or invalid file type"));
      try {
        res.status(200).json(new MessageResponse("File uploaded successfully"));
      } catch (error) {
        if (axios.isAxiosError(error)) {
          logger.error(
            `Error while /new-post: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
          );
        } else {
          logger.error("Error while /new-post: ", error);
        }
        res.status(500).json(new InternalServerError());
      }
    }
  );

  return router;
};
