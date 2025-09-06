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