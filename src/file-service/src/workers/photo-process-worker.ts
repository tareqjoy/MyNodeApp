import { InvalidRequest, PhotoUploadKafkaMsg, ProfilePhotoUpdateReq } from "@tareqjoy/models";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import { getInternalFullPath } from "@tareqjoy/utils";
import { getFileLogger } from "@tareqjoy/utils";
import { PROFILE_PHOTO_VARIANT_SIZES } from "../common/consts";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const logger = getFileLogger(__filename);

const userUpdateProfilePhotoUrl: string =
  process.env.USER_UPDATE_PROFILE_PHOTO_URL ||
  "http://127.0.0.1:5002/v1/user/detail/:userId/profile-photo";


const baseProfilePhotoPath: string =
  process.env.BASE_PROFILE_PHOTO_BASE_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";

export const photoProcessWorker = async (
  messageStr: string
): Promise<boolean> => {
  try {
    const photoUploadKafkaMsg = plainToInstance(
      PhotoUploadKafkaMsg,
      JSON.parse(messageStr)
    );
    const errors = await validate(photoUploadKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${JSON.stringify(new InvalidRequest(errors))}`);
      return true;
    }

    const { userId, photoName, uploadedAt } = photoUploadKafkaMsg;

    const originalPath = path.join(
      baseProfilePhotoPath,
      "original",
      userId!,
      photoName
    );

    // Ensure original file exists
    try {
      await fs.access(originalPath);
    } catch {
      logger.warn(`Original photo not found at path: ${originalPath}`);
      return true;
    }

    const originalImage = sharp(originalPath);

    // Ensure variant directories exist
    await Promise.all(
      Object.keys(PROFILE_PHOTO_VARIANT_SIZES).map((variant) =>
        fs.mkdir(path.join(baseProfilePhotoPath, variant, userId!), {
          recursive: true,
        })
      )
    );

    // Generate resized variants
    await Promise.all(
      Object.entries(PROFILE_PHOTO_VARIANT_SIZES).map(
        async ([variant, width]) => {
          const outputPath = path.join(
            baseProfilePhotoPath,
            variant,
            userId!,
            photoName
          );
          await originalImage
            .clone()
            .resize({ width, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(outputPath);
          logger.debug(`Saved ${variant} variant: ${outputPath}`);
        }
      )
    );
/*
    const profilePhotoUpdateReq = new ProfilePhotoUpdateReq(
      photoName,
      uploadedAt
    );
    const userUpdateProfilePhotoUrlInternal = getInternalFullPath(userUpdateProfilePhotoUrl).replace(":userId", userId!);
    const userUpdateProfilePhotoAxiosRes = await axios.patch(
      userUpdateProfilePhotoUrlInternal,
      profilePhotoUpdateReq
    );

    if (userUpdateProfilePhotoAxiosRes.status !== 200) {
      logger.error(
        `Failed to update user profile photo: ${userUpdateProfilePhotoAxiosRes.statusText}`
      );
      return false;
    }
*/
    await fs.unlink(originalPath);
    logger.debug(`Deleted original file: ${originalPath}`);

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while profile-photo-process worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
      );
    } else {
      logger.error("Error while new-post worker: ", error);
    }
  }
  return false;
};
