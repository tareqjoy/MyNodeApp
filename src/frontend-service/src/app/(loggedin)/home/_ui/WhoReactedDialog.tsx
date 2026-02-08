"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import React from "react";
import { plainToInstance } from "class-transformer";
import { UserLike, WhoLikedRes } from "@tareqjoy/models";
import { authGet } from "@/lib/auth";
import { REACTIONS } from "../../_ui/ReactionMap";

interface ReactionsDialogProps {
  loggedInUsername: string;
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

const whoLikedUrl: string =
  process.env.NEXT_PUBLIC_WHO_LIKED_URL ||
  "/v1/post/like/who";

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
      const axiosResponse = await authGet(whoLikedUrl, {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(3,7,18,0.7)] backdrop-blur-sm"
    >
      <DialogPanel className="w-full max-w-md card p-5 rise-in">
        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                  className="text-blue-600 dark:text-sky-300 hover:underline"
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
          className="mt-4 w-full btn-primary py-2 text-sm font-semibold"
          disabled={loading}
          onClick={() => fetchReactions(nextToken)}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
        )}

        <button
          className="mt-3 w-full btn-secondary py-2 text-sm font-semibold"
          onClick={onClose}
        >
          Close
        </button>
      </DialogPanel>
    </Dialog>
  );
};

export default ReactionsDialog;
