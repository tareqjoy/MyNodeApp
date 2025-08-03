import { InvalidRequest, PhotoUploadKafkaMsg } from "@tareqjoy/models";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import { getInternalFullPath } from "@tareqjoy/utils";
import { getFileLogger } from "@tareqjoy/utils";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const logger = getFileLogger(__filename);

const VARIANT_SIZES = {
  large: 1024,
  medium: 512,
  small: 256,
};

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

    const { userId, photoPath } = photoUploadKafkaMsg;

    const originalPath = path.join(
      baseProfilePhotoPath,
      "original",
      userId!,
      photoPath
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
      Object.keys(VARIANT_SIZES).map((variant) =>
        fs.mkdir(path.join(baseProfilePhotoPath, variant, userId!), {
          recursive: true,
        })
      )
    );

    // Generate resized variants
    await Promise.all(
      Object.entries(VARIANT_SIZES).map(async ([variant, width]) => {
        const outputPath = path.join(
          baseProfilePhotoPath,
          variant,
          userId!,
          photoPath
        );
        await originalImage
          .clone()
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(outputPath);
        logger.debug(`Saved ${variant} variant: ${outputPath}`);
      })
    );


    await fs.unlink(originalPath);
    logger.debug(`Deleted original file: ${originalPath}`);

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while new-post worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${error.message}`
      );
    } else {
      logger.error("Error while new-post worker: ", error);
    }
  }
  return false;
};
