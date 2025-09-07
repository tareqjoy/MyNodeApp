import { InferSchemaType, model, Schema, Types } from "mongoose";

/**
 * Post type enum
 */
export const PostType = {
  NORMAL: "normal",
  PROFILE_PHOTO: "profile_photo",
  COVER_PHOTO: "cover_photo",
  SHARED_POST: "shared_post",
  MEMORY: "memory",
  EVENT: "event",
} as const;


export type PostType = (typeof PostType)[keyof typeof PostType];


export const PostStatus = {
  POSTED: "posted",
  PROCESSED: "processed",
  PROCESS_FAILED: "process_failed",
  FANNED_OUT: "fanned_out",
  FAN_OUT_FAILED: "fan_out_failed",
  ARCHIVED: "archived",
} as const;

export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

/**
 * Post schema
 */
const PostSchema = new Schema({
  _id: { type: Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true },
  time: { type: Number, required: true },
  postType: {
    type: String,
    enum: Object.values(PostType),
    required: true,
  },
  postStatus: {
    type: String,
    enum: Object.values(PostStatus),
    required: true,
    default: PostStatus.POSTED,
  },
  reactions: {
    type: [
      {
        reactType: { type: String, required: true },
        count: { type: Number, required: true, default: 0 },
      },
    ],
    default: [],
  },
  attachments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Attachment",
    },
  ],
});

export const Post = model("Post", PostSchema);

export type PostObject = InferSchemaType<typeof PostSchema>;