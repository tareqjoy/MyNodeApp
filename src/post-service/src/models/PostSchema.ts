import { Schema, Types } from 'mongoose';

export const PostSchema = new Schema({
    _id: Types.ObjectId,
    userid: { type: Schema.Types.ObjectId, ref: 'User' },
    body: { type: String, required: true },
    time: { type: Number, required: true }
});

