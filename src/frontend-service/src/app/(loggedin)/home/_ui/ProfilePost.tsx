'use client';

import { axiosAuthClient } from "@/lib/auth";
import { CreatePostReq, MessageResponse } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { useEffect, useState } from "react";

const postCreateUrl = process.env.NEXT_PUBLIC_POST_CREATE_URL || "/v1/post/create";

const TextPost = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost =  async ()  => {
    if (!content.trim()) return;
    setError('');


          try {
            const createPostReqObj = new CreatePostReq(content, Date.now());
            const axiosResp = await axiosAuthClient.post(postCreateUrl, createPostReqObj);
            const createPostResObj = plainToInstance(MessageResponse, axiosResp.data);
            if(axiosResp.status == 200) {
                setContent('');
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
      <textarea
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        placeholder="What's on your mind?"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        onClick={handlePost}
        disabled={!content.trim()}
      >
        Post
      </button>
    </div>
  );
};

export default TextPost;
