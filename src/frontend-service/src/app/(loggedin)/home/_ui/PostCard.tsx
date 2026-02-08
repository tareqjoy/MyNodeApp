"use client";

import React, { useState } from "react";
import { SinglePost } from "@tareqjoy/models";
import { FaComment } from "react-icons/fa";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import ReactionsDialog from "./WhoReactedDialog";
import { REACTIONS } from "../../_ui/ReactionMap";
import PostBodyFactory from "./PostBodyFactory";

interface PostCardProps {
  loggedInUsername: string;
  post: SinglePost;
  onReact: (postId: string, reaction: string) => void;
  onUnreact: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  loggedInUsername,
  post,
  onReact,
  onUnreact,
}) => {
  const [selectedReaction, setSelectedReaction] = useState<string | undefined>(
    post.myLikeType
  );
  const [hovering, setHovering] = useState<boolean>(false);
  const [hoverTimeout, setHoverTimeout] = useState<any | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);

  // Convert likes array into a map for easier lookup
  const reactionsMap = post.likes.reduce((acc, like) => {
    if (like.count > 0) {
      acc[like.type] = like.count;
    }
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
    const timeout = setTimeout(() => setHovering(true), 700);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setHovering(false), 700);
    setHoverTimeout(timeout);
  };

  const handleReactionSelect = (type: string) => {
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
    <div className="p-5 card relative transition-transform duration-200 hover:-translate-y-0.5">
      {/* User Info */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-semibold">
          {post.username?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <a
            href={`/profile/${post.username}`}
            className="text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-white font-semibold transition"
          >
            {post.username}
          </a>
          <p
            className="text-xs text-gray-500 dark:text-gray-400"
            title={format(new Date(post.time), "PPpp")}
          >
            {formatDistanceToNow(new Date(post.time), { addSuffix: true })}
          </p>
        </div>
      </div>
      <PostBodyFactory post={post} />

      {/* Reactions Summary */}
      <div className="mt-2 flex items-center space-x-2">
        <div
          className="flex items-center space-x-1 cursor-pointer"
          onClick={() => totalReactions > 0 && setDialogOpen(true)}
        >
          <div className="flex items-center space-x-1">
            {topReactions.map(([reactionType], index) => {
              const reaction = REACTIONS.get(reactionType);
              return (
                <div
                  key={reactionType}
                  className="w-2.5 h-6"
                  style={{ zIndex: topReactions.length - index }}
                >
                  {reaction}
                </div>
              );
            })}
          </div>
          {totalReactions > 0 && (
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 ml-3 hover:underline">
              {totalReactions} {totalReactions <= 1 ? "reaction" : "reactions"}
            </span>
          )}

          {/* Dialog for viewing all reactions */}
          <ReactionsDialog
            loggedInUsername={loggedInUsername}
            postId={post.postId}
            isOpen={isDialogOpen}
            onClose={() => setDialogOpen(false)}
          />
        </div>
        {/* Separator & Comment Count */}
        <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:underline">
          {0} comments
        </span>
      </div>

      {/* Reaction and Comment Section */}
      <div className="mt-3 flex w-full relative border-t border-white/70 dark:border-white/10 pt-2">
        {/* Reactions */}
        <div className="flex-1 flex justify-center items-center cursor-pointer">
          <div
            className="relative flex items-center space-x-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              onClick={() => handleReactionSelect(selectedReaction || "love")}
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {selectedReaction ? REACTIONS.get(selectedReaction) : "🤍"}
              </motion.div>
            </div>

            {hovering && (
              <motion.div
                className="absolute bottom-8 flex bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-1 border border-gray-100 dark:border-white/10"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.01 }}
              >
                {[...REACTIONS].map(([type, icon]) => (
                  <motion.div
                    key={type}
                    className={`cursor-pointer text-2xl p-1 rounded-xl transition ${
                      selectedReaction === type ? "bg-gray-200 dark:bg-white/10" : ""
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

        <div className="flex-1 flex justify-center items-center cursor-pointer border-l border-white/70 dark:border-white/10">
          <motion.div
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <FaComment size={18} className="text-slate-500 dark:text-slate-300" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
