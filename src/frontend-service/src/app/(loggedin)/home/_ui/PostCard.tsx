import React from "react";
import { SinglePost } from "@tareqjoy/models";
import { FaHeart, FaComment } from "react-icons/fa";

interface PostCardProps {
  post: SinglePost;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const likesCount = 0;
    const commentsCount = 0;
    const hasLiked: boolean = false; 
  return (
    <div className="p-4 border rounded-lg shadow-sm">
    {/* Clickable Username */}
    <a href={`/profile/${post.username}`} className="text-blue-500 hover:underline">
      {post.username}
    </a>
    <p className="text-sm text-gray-600">{new Date(post.time).toLocaleString()}</p>
    <p className="text-gray-200">{post.body}</p>

    {/* Icons with counts */}
    <div className="mt-4 flex w-full">
      {/* Love icon section */}
      <div className="flex-1 flex justify-center items-center cursor-pointer">
        <div className="flex items-center space-x-2">
          <FaHeart
            size={18}
            color={hasLiked ? "red" : "gray"} // Red heart if liked, gray otherwise
          />
          {likesCount > 0 && <span>{likesCount}</span>}
        </div>
      </div>

      {/* Comment icon section */}
      <div className="flex-1 flex justify-center items-center cursor-pointer">
        <div className="flex items-center space-x-2">
          <FaComment size={18} color="gray"/>
          {commentsCount > 0 && <span>{commentsCount}</span>}
        </div>
      </div>
    </div>
  </div>
  );
};

export default PostCard;
