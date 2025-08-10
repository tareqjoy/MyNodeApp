import { InferSchemaType, model, Schema, Types } from "mongoose";

const PostTypes = [
  "normal",
  "profile_photo",
  "cover_photo",
  "shared_post",
  "memory",
  "event",
] as const;
type PostType = (typeof PostTypes)[number];

const PostSchema = new Schema({
  _id: { type: Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true },
  time: { type: Number, required: true },
  postType: {
    type: String,
    enum: PostTypes,
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