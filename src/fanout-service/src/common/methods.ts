import { Post, PostStatus } from "@tareqjoy/clients";
import mongoose, { Mongoose } from "mongoose";

export async function updatePostStatus(
  postId: string,
  status: PostStatus
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    console.warn(`Invalid postId: ${postId}`);
    return false;
  }

  try {
    const result = await Post.findByIdAndUpdate(
      postId,
      { $set: { postStatus: status } },
      { new: true }
    );

    if (!result) {
      console.warn(`Post not found: ${postId}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Failed to update post status for ${postId}:`, err);
    return false;
  }
}
