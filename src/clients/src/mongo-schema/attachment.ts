import { InferSchemaType, model, Schema, Types } from "mongoose";

/**
 * Attachment type enum
 */
export const AttachmentType = {
  IMAGE: "image",
  AUDIO: "audio",
  VIDEO: "video",
  DOCUMENT: "document",
} as const;
export type AttachmentType =
  (typeof AttachmentType)[keyof typeof AttachmentType];

/**
 * Attachment status enum
 */
export const AttachmentStatus = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  DELETED: "deleted",
} as const;
export type AttachmentStatus =
  (typeof AttachmentStatus)[keyof typeof AttachmentStatus];

/**
 * Linked entity enum
 */
export const LinkedEntity = {
  POST: "Post",
  CHAT: "Chat",
  COMMENT: "Comment",
} as const;
export type LinkedEntity = (typeof LinkedEntity)[keyof typeof LinkedEntity];

/**
 * Version type enum
 */
export const VersionType = {
  ORIGINAL: "original",
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
} as const;
export type VersionType = (typeof VersionType)[keyof typeof VersionType];

/**
 * Version schema
 */
const VersionSchema = new Schema(
  {
    filePath: { type: String, required: true },
    manifestUrl: { type: String },
    status: {
      type: String,
      enum: Object.values(AttachmentStatus),
      default: AttachmentStatus.UPLOADED,
      required: true,
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      bitrate: Number,
      codec: String,
    },
  },
  { _id: false }
);

/**
 * Attachment schema
 */
const AttachmentSchema = new Schema(
  {
    _id: { type: Types.ObjectId, required: true },

    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    linkedTo: {
      type: String,
      enum: Object.values(LinkedEntity),
      default: null,
    },
    linkedId: {
      type: Types.ObjectId,
      default: null,
      index: true,
    },

    versions: {
      type: Map,
      of: VersionSchema,
      default: {},
    },

    uploadedAt: { type: Date, default: Date.now },

    type: {
      type: String,
      enum: Object.values(AttachmentType),
      required: true,
    },
  },
  { timestamps: true }
);

AttachmentSchema.index({ userId: 1, linkedTo: 1, type: 1, uploadedAt: -1 });
AttachmentSchema.index({ userId: 1, linkedTo: 1, uploadedAt: -1 });
AttachmentSchema.index({ linkedTo: 1, uploadedAt: -1 });

export const Attachment = model("Attachment", AttachmentSchema);
export type AttachmentObject = InferSchemaType<typeof AttachmentSchema>;
