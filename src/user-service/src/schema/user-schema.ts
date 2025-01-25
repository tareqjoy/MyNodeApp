import { Schema, Types } from "mongoose";

export const UserSchema = new Schema({
  _id: Types.ObjectId,
  username: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  birthYear: { type: Number, min: 1900 },
  password: { type: String, required: true },
});
