import { InferSchemaType, model, Schema, Types } from "mongoose";

const AttachmentTypes = ["image", "audio", "video", "document"] as const;
type AttachmentType = (typeof AttachmentTypes)[number];

const AttachmentStatuses = [
  "uploaded",
  "processing",
  "ready",
  "failed",
  "deleted",
] as const;
type AttachmentStatus = (typeof AttachmentStatuses)[number];

const LinkedEntities = ["Post", "Chat", "Comment"] as const;
type LinkedEntity = (typeof LinkedEntities)[number];

const VersionSchema = new Schema(
  {
    filePath: { type: String, required: true },
    manifestUrl: { type: String },
    status: {
      type: String,
      enum: AttachmentStatuses,
      default: "uploaded",
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

const AttachmentSchema = new Schema(
  {
    _id: { type: Types.ObjectId, required: true },

    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    linkedTo: {
      type: String,
      enum: LinkedEntities,
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
      enum: AttachmentTypes,
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
