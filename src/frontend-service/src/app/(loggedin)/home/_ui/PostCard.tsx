"use client";

import React, { useState } from "react";
import { SinglePost, SingleLike } from "@tareqjoy/models";
import { FaHeart, FaLaugh, FaAngry, FaSadTear, FaComment } from "react-icons/fa";

// Define available reactions
const REACTIONS = [
  { type: "love", icon: <FaHeart color="red" />, color: "red" },
  { type: "haha", icon: <FaLaugh color="yellow" />, color: "yellow" },
  { type: "angry", icon: <FaAngry color="orange" />, color: "orange" },
  { type: "sad", icon: <FaSadTear color="blue" />, color: "blue" },
];

interface PostCardProps {
  post: SinglePost;
  onReact: (postId: string, reaction: string) => void; // Callback for updating reaction
}

const PostCard: React.FC<PostCardProps> = ({ post, onReact }) => {
  const [selectedReaction, setSelectedReaction] = useState<string>(post.myLikeType || "love");
  const [hovering, setHovering] = useState<boolean>(false);

  // Convert likes array into a map for easier lookup
  const reactionsMap = post.likes.reduce((acc, like) => {
    acc[like.type] = like.count;
    return acc;
  }, {} as Record<string, number>);

  // Sort reactions by count (descending) and get top 3
  const sortedReactions = Object.entries(reactionsMap).sort((a, b) => b[1] - a[1]);
  const topReactions = sortedReactions.slice(0, 3);
  const totalReactions = sortedReactions.reduce((sum, [, count]) => sum + count, 0);

  const handleReactionSelect = (reaction: string) => {
    setSelectedReaction(reaction);
    onReact(post.postId, reaction); // Call backend update function
    setHovering(false); // Hide floating panel after selecting
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm relative">
      {/* Clickable Username */}
      <a href={`/profile/${post.username}`} className="text-blue-500 hover:underline">
        {post.username}
      </a>
      <p className="text-sm text-gray-600">{new Date(post.time).toLocaleString()}</p>
      <p className="text-gray-200">{post.body}</p>

      {/* Reaction and Comment Section */}
      <div className="mt-4 flex w-full relative">
        {/* Reactions */}
        <div className="flex-1 flex justify-center items-center cursor-pointer relative"
             onMouseEnter={() => setHovering(true)}
             onMouseLeave={() => setHovering(false)}
        >
          {/* Floating Reaction Panel */}
          {hovering && (
            <div className="absolute bottom-8 flex space-x-2 bg-white shadow-lg rounded-lg p-2">
              {REACTIONS.map(({ type, icon }) => (
                <div key={type} className="cursor-pointer" onClick={() => handleReactionSelect(type)}>
                  {icon}
                </div>
              ))}
            </div>
          )}

          {/* Selected Reaction */}
          <div className="flex items-center space-x-2">
            {REACTIONS.find((r) => r.type === selectedReaction)?.icon || <FaHeart color="red" />}
          </div>
        </div>

        {/* Display Top 3 Reactions + Total Count */}
        <div className="flex-1 flex justify-center items-center">
          {topReactions.map(([reaction, count], index) => (
            <div key={index} className="flex items-center space-x-1 -ml-2">
              {REACTIONS.find((r) => r.type === reaction)?.icon}
              <span className="text-sm font-medium">{count}</span>
            </div>
          ))}
          <span className="ml-2 text-sm font-semibold"> {totalReactions} </span>
        </div>

        {/* Comments */}
        <div className="flex-1 flex justify-center items-center cursor-pointer">
          <FaComment size={18} color="gray" />
          <span className="ml-1">{0}</span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
