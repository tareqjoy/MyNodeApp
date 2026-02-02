"use client";

import { Dispatch, SetStateAction } from "react";
import { axiosAuthClient } from "@/lib/auth";
import {
  GetPostReq,
  LikeReq,
  PostDetailsRes,
  SinglePost,
  UnlikeReq,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";

const getPostsUrl: string =
  process.env.NEXT_PUBLIC_GET_POSTS_URL || "/v1/post/get";
const likeUnlikeUrl: string =
  process.env.NEXT_PUBLIC_LIKE_UNLIKE_URL || "/v1/post/like";

type UsePostReactionsArgs = {
  setPosts: Dispatch<SetStateAction<SinglePost[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
};

export default function usePostReactions({
  setPosts,
  setError,
}: UsePostReactionsArgs) {
  const refreshSinglePost = async (postId: string) => {
    try {
      const getPostReq = new GetPostReq([postId], true);
      const axiosGetPostResp = await axiosAuthClient.post(
        getPostsUrl,
        getPostReq
      );
      const postDetailsResObj = plainToInstance(
        PostDetailsRes,
        axiosGetPostResp.data
      );

      const updatedPost = postDetailsResObj.posts[0];
      if (!updatedPost) return;

      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.postId === postId ? updatedPost : p))
      );
    } catch (err) {
      setError("Failed to refresh post.");
    }
  };

  const handleReact = async (postId: string, reaction: string) => {
    try {
      const likeReq = new LikeReq(postId, reaction, Date.now());
      await axiosAuthClient.post(`${likeUnlikeUrl}?type=like`, likeReq);
      await refreshSinglePost(postId);
    } catch (err) {
      setError("Failed to react.");
    }
  };

  const handleUnreact = async (postId: string) => {
    try {
      const unlikeReq = new UnlikeReq(postId);
      await axiosAuthClient.post(`${likeUnlikeUrl}?type=unlike`, unlikeReq);
      await refreshSinglePost(postId);
    } catch (err) {
      setError("Failed to react.");
    }
  };

  return { handleReact, handleUnreact };
}
