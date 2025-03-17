import { Schema, Types } from "mongoose";

export const PostLikeSchema = new Schema({
  postId: { type: Types.ObjectId, ref: "Post", required: true, index: true },
  userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
  likeType: { type: String, required: true },
  createdAt: { type: Number, required: true },
});

PostLikeSchema.index({ userId: 1, postId: 1 }, { unique: true });