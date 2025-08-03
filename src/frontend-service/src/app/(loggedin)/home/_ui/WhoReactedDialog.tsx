"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import React from "react";
import { plainToInstance } from "class-transformer";
import { UserLike, WhoLikedRes } from "@tareqjoy/models";
import { axiosAuthClient } from "@/lib/auth";
import { REACTIONS } from "../../_ui/ReactionMap";

interface ReactionsDialogProps {
  loggedInUsername: string;
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const whoLikedUrl: string =
  process.env.NEXT_PUBLIC_WHO_LIKED_URL ||
  "http://localhost:80/v1/post/like/who";

const ReactionsDialog: React.FC<ReactionsDialogProps> = ({
  loggedInUsername,
  postId,
  isOpen,
  onClose,
}) => {
  const [reactions, setReactions] = useState<UserLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const fetchReactions = async (
    nextToken: string | undefined,
    reset: boolean = false
  ) => {
    setLoading(true);
    try {
      const axiosResponse = await axiosAuthClient.get(whoLikedUrl, {
        params: { postId, nextToken },
      });

      const whoLikedObj = plainToInstance(WhoLikedRes, axiosResponse.data);

      setReactions((prev) =>
        reset ? whoLikedObj.likes : [...prev, ...whoLikedObj.likes]
      );
      setHasMore(
        whoLikedObj.pageToken !== undefined && whoLikedObj.pageToken !== null
      );
      setNextToken(whoLikedObj.pageToken);
    } catch (error) {
      console.error("Failed to load reactions", error);
    }
    setLoading(false);
  };

    useEffect(() => {
    if (isOpen) {
      setReactions([]);
      setNextToken(undefined);
      setHasMore(false);
      fetchReactions(undefined, true); // Reset on open
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.85)]" // Adjusted the opacity here
    >
      <DialogPanel className="w-full max-w-md bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
        <DialogTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Reactions
        </DialogTitle>

        <div className="mt-4 max-h-60 overflow-y-auto">
          {reactions.map((reaction) => (
            <div
              key={reaction.username}
              className="flex items-center space-x-2 border-b py-2"
            >
              <span className="text-lg">{REACTIONS.get(reaction.type)}</span>
              <span className="text-gray-700 dark:text-gray-300">
                <a
                  href={`/profile/${reaction.username}`}
                  className="text-blue-500 hover:underline"
                >
                  {reaction.username === loggedInUsername
                    ? "You"
                    : reaction.username}
                </a>
              </span>
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            className="mt-4 w-full bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
            disabled={loading}
            onClick={() => fetchReactions(nextToken)}
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        )}

        <button
          className="mt-4 w-full bg-gray-300 dark:bg-gray-700 py-1 rounded hover:bg-gray-400"
          onClick={onClose}
        >
          Close
        </button>
      </DialogPanel>
    </Dialog>
  );
};

export default ReactionsDialog;
