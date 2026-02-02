"use client";

import { SinglePost } from "@tareqjoy/models";
import PostCard from "../home/_ui/PostCard";
import StateMessage from "./StateMessage";

type PostFeedProps = {
  posts: SinglePost[];
  error: string | null;
  loading: boolean;
  nextToken: string | null;
  loggedInUsername: string;
  onReact: (postId: string, reaction: string) => void | Promise<void>;
  onUnreact: (postId: string) => void | Promise<void>;
  onLoadMore: () => void;
  emptyMessage?: string;
};

export default function PostFeed({
  posts,
  error,
  loading,
  nextToken,
  loggedInUsername,
  onReact,
  onUnreact,
  onLoadMore,
  emptyMessage = "No posts available.",
}: PostFeedProps) {
  return (
    <div className="w-full max-w-5xl mt-6">
      {error && (
        <StateMessage variant="error" message={error} center={false} />
      )}
      {posts.length === 0 && !loading && (
        <StateMessage variant="empty" message={emptyMessage} center={false} />
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            loggedInUsername={loggedInUsername}
            post={post}
            onReact={onReact}
            onUnreact={onUnreact}
          />
        ))}
      </div>

      {nextToken && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
