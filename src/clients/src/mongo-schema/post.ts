import { model, Schema, Types } from "mongoose";

const PostSchema = new Schema({
  _id: { type: Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true },
  time: { type: Number, required: true },
  reactions: {
    type: [
      {
        reactType: { type: String, required: true },
        count: { type: Number, required: true, default: 0 }
      }
    ],
    default: []
  },
});

export const Post = model("Post", PostSchema);