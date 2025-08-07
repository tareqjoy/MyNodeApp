import { model, Schema, Types } from "mongoose";

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
    name: {
      type: String,
      required: true,
      // Examples: "original", "small", "medium", "large", "720p-hls", "mp3", "aac"
    },
    filePath: { type: String, required: true }, // For direct file versions (images, audio, non-segmented video)
    manifestUrl: { type: String }, // For segmented streaming video (e.g. HLS playlist)

    status: {
      type: String,
      enum: AttachmentStatuses,
      default: "uploaded",
      required: true
    },

    metadata: {
      width: Number, // for images and videos
      height: Number, // for images and videos
      duration: Number, // seconds, for audio/video
      bitrate: Number, // kbps, for audio/video
      codec: String, // optional codec info
    },
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    _id: Types.ObjectId,

    userId: { type: Types.ObjectId, required: true, ref: "User", index: true }, // Reference to User
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
      type: [VersionSchema],
      default: [],
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
