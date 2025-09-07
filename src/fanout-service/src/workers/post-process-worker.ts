import { AttachmentInfos, NewPostKafkaMsg } from "@tareqjoy/models";
import axios from "axios";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { workerOperationCount } from "../metrics/metrics";
import { getInternalFullPath, withRetry } from "@tareqjoy/utils";
import { getFileLogger } from "@tareqjoy/utils";
import { PROFILE_PHOTO_VARIANT_SIZES } from "../common/consts";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { Producer } from "kafkajs";
import mongoose, { Mongoose } from "mongoose";
import {
  Attachment,
  AttachmentStatus,
  AttachmentType,
  PostStatus,
  PostType,
  User,
  VersionType,
} from "@tareqjoy/clients";
import { updatePostStatus } from "../common/methods";

const logger = getFileLogger(__filename);

const getAttachmentUrl: string =
  process.env.USER_UPDATE_PROFILE_PHOTO_URL ||
  "http://127.0.0.1:5008/v1/file/attachment-info";
const kafka_new_post_fanout_topic =
  process.env.KAFKA_NEW_POST_FANOUT_TOPIC || "post-fanout";

const baseProfilePhotoVariantPath: string =
  process.env.PROFILE_PHOTO_VARIANTS_BASE_PATH ||
  "/data/mynodeapp/uploads/profile-photo/";

export const postProcessWorker = async (
  messageStr: string,
  mongoClient: Mongoose,
  kafkaProducer: Producer
): Promise<boolean> => {
  const newPostKafkaMsg = plainToInstance(
    NewPostKafkaMsg,
    JSON.parse(messageStr)
  );
  const errors = await validate(newPostKafkaMsg);

  if (errors.length > 0) {
    logger.warn(`Bad data found from Kafka: ${JSON.stringify(errors)}`);
    return true;
  }

  const { userId, attachmentIds, postTime } = newPostKafkaMsg;
  try {
    if (!(await processAttachments(attachmentIds, userId))) {
      return false;
    }

    if (!(await processPostType(newPostKafkaMsg))) {
      return false;
    }

    await kafkaProducer.send({
      topic: kafka_new_post_fanout_topic,
      messages: [
        {
          key: userId,
          value: JSON.stringify(newPostKafkaMsg),
        },
      ],
    });

    await updatePostStatus(newPostKafkaMsg.postId, PostStatus.PROCESSED);
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(
        `Error while profile-photo-process worker: url: ${error.config?.url}, status: ${error.response?.status}, message: ${JSON.stringify(error.response?.data)}`
      );
    } else {
      logger.error("Error while new-post worker: ", error);
    }
    await updatePostStatus(newPostKafkaMsg.postId, PostStatus.PROCESS_FAILED);
  }

  return false;
};

const processAttachments = async (
  attachmentIds: string[],
  userId: string
): Promise<boolean> => {
  if (attachmentIds.length <= 0) {
    return true;
  }

  return withRetry(async () => {
    logger.debug(
      `Attachment found to be processed, count: ${attachmentIds.length}`
    );

    const attachmentInfoAxiosRes = await axios.get(
      getInternalFullPath(getAttachmentUrl),
      {
        params: { ids: attachmentIds },
      }
    );

    const attachmentInfosResponseObj = plainToInstance(
      AttachmentInfos,
      attachmentInfoAxiosRes.data
    );

    for (const attachmentInfo of attachmentInfosResponseObj.attachments) {
      if (attachmentInfo.type === AttachmentType.IMAGE) {
        const originalPath = attachmentInfo.versions.original?.filePath;
        if (!originalPath) {
          logger.warn(
            `Original file path not found for attachment: ${attachmentInfo.id}`
          );
          continue;
        }

        try {
          await fs.access(originalPath);
        } catch {
          logger.warn(
            `Access error or Original photo not found at path: ${originalPath}`
          );
          // non-retryable → bail immediately
          return false;
        }

        const originalImage = sharp(originalPath);
        const photoName = path.basename(originalPath);
        logger.debug(`photo name is: ${photoName}`);

        await Promise.all(
          Object.keys(PROFILE_PHOTO_VARIANT_SIZES).map((variant) =>
            fs.mkdir(getProfilePhotoPath(variant, userId), { recursive: true })
          )
        );

        await Promise.all(
          Object.entries(PROFILE_PHOTO_VARIANT_SIZES).map(([variant, width]) =>
            processVariant(
              variant as VersionType,
              width,
              originalImage,
              userId,
              photoName,
              attachmentInfo.id
            )
          )
        );
      }
    }

    return true;
  });
};

const processPostType = async (msg: NewPostKafkaMsg): Promise<boolean> => {
  switch (msg.postType) {
    case PostType.PROFILE_PHOTO: {
      try {
        await withRetry(
          () =>
            User.findByIdAndUpdate(
              msg.userId,
              {
                $set: {
                  "profilePhoto.post": msg.postId,
                  "profilePhoto.attachment": msg.attachmentIds[0] || null,
                },
              },
              { new: true }
            ),
          3, // retries
          300 // delay
        );
        return true;
      } catch (err) {
        logger.error(
          `Failed to update profile photo for user ${msg.userId} after retries: ${err}`
        );
        return false;
      }
    }

    default:
      return true;
  }
};

export const getProfilePhotoPath = (
  variant: string,
  userId: string
): string => {
  return path.join(baseProfilePhotoVariantPath, variant, userId);
};

async function processVariant(
  variant: VersionType,
  width: number,
  originalImage: sharp.Sharp,
  userId: string,
  photoName: string,
  attachmentId: string,
  maxRetries = 3
) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const outputPath = path.join(
        getProfilePhotoPath(variant, userId),
        photoName
      );

      // Resize the image
      const image = originalImage
        .clone()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 80 });

      // Get actual dimensions
      const metadata = await image
        .toBuffer()
        .then((buf) => sharp(buf).metadata());

      // Save file
      await image.toFile(outputPath);

      logger.debug(`Saved ${variant} variant: ${outputPath}`);

      const newVersion = {
        filePath: outputPath,
        status: AttachmentStatus.READY,
        metadata: {
          width: metadata.width ?? width,
          height: metadata.height ?? 0,
        },
      };

      // Update the Attachment document
      await Attachment.findByIdAndUpdate(
        attachmentId,
        {
          $set: {
            [`versions.${variant}`]: newVersion,
          },
        },
        { new: false }
      );

      // Success — exit loop
      return;
    } catch (err) {
      attempt++;
      console.warn(`Failed processing ${variant} (attempt ${attempt}):`, err);
      if (attempt >= maxRetries) {
        console.error(`Giving up on ${variant} after ${maxRetries} attempts.`);
        throw err;
      }
      // optional: wait before retrying
      await new Promise((res) => setTimeout(res, 500));
    }
  }
}
