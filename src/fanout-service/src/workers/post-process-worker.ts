import {
  AttachmentInfos,
  InvalidRequest,
  NewPostKafkaMsg,
  PhotoUploadKafkaMsg,
  ProfilePhotoUpdateReq,
} from "@tareqjoy/models";
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
import { Producer } from "kafkajs";
import { Attachment } from "@tareqjoy/clients";

const logger = getFileLogger(__filename);

const getAttachmentUrl: string =
  process.env.USER_UPDATE_PROFILE_PHOTO_URL ||
  "http://127.0.0.1:5008/v1/file/attachment-info";


const baseProfilePhotoVariantPath: string =
    process.env.PROFILE_PHOTO_VARIANTS_BASE_PATH ||
    "/data/mynodeapp/uploads/profile-photo/";

export const postProcessWorker = async (
  messageStr: string,
  kafkaProducer: Producer
): Promise<boolean> => {
  try {
    const newPostKafkaMsg = plainToInstance(
      NewPostKafkaMsg,
      JSON.parse(messageStr)
    );
    const errors = await validate(newPostKafkaMsg);

    if (errors.length > 0) {
      logger.warn(`Bad data found from Kafka: ${new InvalidRequest(errors)}`);
      return true;
    }

    const { userId, attachmentIds, postTime } = newPostKafkaMsg;

    const attachmentInfoAxiosRes = await axios.get(
      getInternalFullPath(getAttachmentUrl),
      {
        params: {
          ids: attachmentIds,
        },
      }
    );

    const attachmentInfosResponseObj = plainToInstance(
      AttachmentInfos,
      attachmentInfoAxiosRes.data
    );

    for (const attachmentInfo of attachmentInfosResponseObj.attachments) {
      if (attachmentInfo.type !== "image") {

        const originalPath = attachmentInfo.versions.original?.filePath;
        if (!originalPath) {
          logger.warn(
            `Original file path not found for attachment: ${attachmentInfo.id}`
          );
          continue;
        }
        // Ensure original file exists
        try {
          await fs.access(originalPath);
        } catch {
          logger.warn(`Original photo not found at path: ${originalPath}`);
          return true;
        }

        const originalImage = sharp(originalPath);
        const photoName = path.basename(originalPath);

        // Ensure variant directories exist
        await Promise.all(
          Object.keys(PROFILE_PHOTO_VARIANT_SIZES).map((variant) =>
            fs.mkdir(getProfilePhotoPath(variant, userId), {
              recursive: true,
            })
          )
        );

        // Generate resized variants
        await Promise.all(
          Object.entries(PROFILE_PHOTO_VARIANT_SIZES).map(
            async ([variant, width]) => {
              const outputPath = path.join(
                getProfilePhotoPath(variant, userId),
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
      }
    }

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


export const getProfilePhotoPath = (variant: string, userId: string): string => {
  return path.join(baseProfilePhotoVariantPath, variant, userId);
}