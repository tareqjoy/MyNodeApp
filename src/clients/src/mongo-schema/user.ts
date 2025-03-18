import { model, Schema, Types } from "mongoose";

export const UserSchema = new Schema({
  _id: Types.ObjectId,
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  birthDay: { type: Date, required: true },
  gender: { type: String, required: true },
});

export const User = model("User", UserSchema);