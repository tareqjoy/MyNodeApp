"use client";

import React, { useState } from "react";
import { SinglePost } from "@tareqjoy/models";
import {
  FaComment,
} from "react-icons/fa";
import { motion } from "framer-motion";

// Define available reactions
const REACTIONS = [
  { type: "love", icon: <span>❤️</span> },
  { type: "angry", icon: <span>😡</span> },
  { type: "haha", icon: <span>😂</span> },
  { type: "sad", icon: <span>😢</span> },
];

interface PostCardProps {
  post: SinglePost;
  onReact: (postId: string, reaction: string) => void; // Callback for updating reaction
  onUnreact: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onReact, onUnreact }) => {
  const [selectedReaction, setSelectedReaction] = useState<string | undefined>(
    post.myLikeType
  );
  const [hovering, setHovering] = useState<boolean>(false);
  const [hoverTimeout, setHoverTimeout] = useState<any | null>(null);

  // Convert likes array into a map for easier lookup
  const reactionsMap = post.likes.reduce((acc, like) => {
    acc[like.type] = like.count;
    return acc;
  }, {} as Record<string, number>);

  // Sort reactions by count (descending) and get top 3
  const sortedReactions = Object.entries(reactionsMap).sort(
    (a, b) => b[1] - a[1]
  );
  const topReactions = sortedReactions.slice(0, 3);
  const totalReactions = sortedReactions.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  const handleMouseEnter = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setHovering(true), 700); // 700ms delay before showing
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setHovering(false), 700); // Hide after 3s
    setHoverTimeout(timeout);
  };

  const handleReactionSelect = (type: string) => {
    console.log("found: "+type )
    if (selectedReaction === type) {
      setSelectedReaction(undefined);
      onUnreact(post.postId); 
    } else {
      setSelectedReaction(type);
      onReact(post.postId, type); 
    }
    setHovering(false);
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm relative">
      {/* Clickable Username */}
      <a
        href={`/profile/${post.username}`}
        className="text-blue-500 hover:underline"
      >
        {post.username}
      </a>
      <p className="text-sm text-gray-600">
        {new Date(post.time).toLocaleString()}
      </p>
      <p className="text-gray-00">{post.body}</p>

      {/* Reaction and Comment Section */}
      <div className="mt-4 flex w-full relative">
        {/* Reactions */}
        <div className="flex-1 flex items-center">
          {/* Selected Reaction with Hoverable Effect */}
          <div
            className="relative flex items-center space-x-2 cursor-pointer"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ type: "spring", stiffness: 300 , damping: 15 }}
            >
              {REACTIONS.find((r) => r.type === selectedReaction)?.icon || "🤍"}
            </motion.div>
            <span className="text-sm font-semibold ml-1">{totalReactions}</span>

            {hovering && (
              <motion.div
                className="absolute bottom-10 flex space-x-3 bg-white shadow-lg rounded-lg p-2"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.01 }}
              >
                {REACTIONS.map(({ type, icon }) => (
                  <motion.div
                    key={type}
                    className={`cursor-pointer text-2xl p-1 rounded-lg transition ${
                      selectedReaction === type ? "bg-gray-200" : ""
                    }`}
                    onClick={() => handleReactionSelect(type)}
                    whileHover={{ scale: 1.4 }}
                    transition={{ duration: 0.01 }}
                  >
                    {icon}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
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
