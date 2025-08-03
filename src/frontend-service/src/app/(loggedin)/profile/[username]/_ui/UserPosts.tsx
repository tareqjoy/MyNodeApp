"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient, getUserName } from "@/lib/auth";
import {
  GetPostByUserReq,
  GetPostReq,
  LikeReq,
  PostDetailsRes,
  SinglePost,
  UnlikeReq,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import PostCard from "../../../home/_ui/PostCard"; // Import the new PostCard component

const userPostsUrl: string =
  process.env.NEXT_PUBLIC_USER_POSTS_URL ||
  "http://localhost:80/v1/post/get-by-user";
const likeUnlikeUrl: string =
  process.env.NEXT_PUBLIC_LIKE_UNLIKE_URL || "http://localhost:80/v1/post/like";
  const getPostsUrl: string =
  process.env.NEXT_PUBLIC_GET_POSTS_URL || "http://localhost:80/v1/post/get";

export default function UserPosts({
  userIdOrName,
  isProvidedUsername,
}: {
  userIdOrName: string;
  isProvidedUsername: boolean;
}) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSinglePost = async (postId: string) => {
    try {
      const getPostReq = new GetPostReq([postId], true);
      const axiosGetPostResp = await axiosAuthClient.post(getPostsUrl, getPostReq);
      const postDetailsResObj = plainToInstance(PostDetailsRes, axiosGetPostResp.data);
  
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

  const fetchPosts = async (loadMore = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const postByUserReq = new GetPostByUserReq(
        [userIdOrName],
        isProvidedUsername,
        {
          nextToken: nextToken || undefined,
          returnOnlyPostId: false,
          limit: 10,
        }
      );
      const axiosResp = await axiosAuthClient.post(userPostsUrl, postByUserReq);

      const postDetailsResObj = plainToInstance(PostDetailsRes, axiosResp.data);

      for (const post of postDetailsResObj.posts) {
        post.username = getUserName() || "";
      }

      setPosts((prev) =>
        loadMore
          ? [...prev, ...postDetailsResObj.posts]
          : postDetailsResObj.posts
      );
      setNextToken(postDetailsResObj.paging?.nextToken || null);
    } catch (err) {
      setError("Failed to load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="w-full max-w-5xl mt-6">
      {error && <p className="text-red-500">{error}</p>}
      {posts.length === 0 && !loading && (
        <p className="text-gray-500">No posts available.</p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            loggedInUsername={getUserName()!}
            key={post.postId}
            post={post}
            onReact={handleReact}
            onUnreact={handleUnreact}
          />
        ))}
      </div>

      {nextToken && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          onClick={() => fetchPosts(true)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
