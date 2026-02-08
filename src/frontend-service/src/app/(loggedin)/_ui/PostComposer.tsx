"use client";

import { useState } from "react";
import { authPost } from "@/lib/auth";
import { CreatePostReq, MessageResponse } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import StateMessage from "./StateMessage";

const postCreateUrl: string =
  process.env.NEXT_PUBLIC_POST_CREATE_URL || "/v1/post/create";

type PostComposerProps = {
  placeholder?: string;
};

export default function PostComposer({
  placeholder = "What's on your mind?",
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!content.trim() || loading) return;
    setError(null);
    setLoading(true);

    try {
      const createPostReqObj = new CreatePostReq(content, Date.now());
      const axiosResp = await authPost(
        postCreateUrl,
        createPostReqObj
      );
      plainToInstance(MessageResponse, axiosResp.data);
      if (axiosResp.status === 200) {
        setContent("");
      } else {
        setError("Failed to post.");
      }
    } catch (err) {
      setError("Failed to post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <textarea
        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:outline-none transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
        placeholder={placeholder}
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {error && (
        <StateMessage variant="error" message={error} center={false} />
      )}
      <button
        className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60"
        onClick={handlePost}
        disabled={!content.trim() || loading}
      >
        {loading ? "Posting..." : "Post"}
      </button>
    </div>
  );
}
