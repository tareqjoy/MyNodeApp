"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient } from "@/lib/auth";
import {
  GetPostReq,
  LikeReq,
  PostDetailsRes,
  SinglePost,
  TimelineHomeReq,
  TimelineHomeRes,
  UnlikeReq,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import PostCard from "./PostCard"; // Import the new PostCard component

const timelineUrl: string =
  process.env.NEXT_PUBLIC_TIMELINE_HOME_URL ||
  "http://localhost:80/v1/timeline/home";
const getPostsUrl: string =
  process.env.NEXT_PUBLIC_GET_POSTS_URL || "http://localhost:80/v1/post/get";
const likeUnlikeUrl: string =
  process.env.NEXT_PUBLIC_LIKE_UNLIKE_URL || "http://localhost:80/v1/post/like";

export default function TimelinePosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReact = async (postId: string, reaction: string) => {
    try {
      const likeReq = new LikeReq(postId, reaction, Date.now());
      await axiosAuthClient.post(
        `${likeUnlikeUrl}?type=like`,
        likeReq
      );
    } catch (err) {
      setError("Failed to react.");
    } 
  };

  const handleUnreact = async (postId: string) => {
    try {
      const unlikeReq = new UnlikeReq(postId);
      await axiosAuthClient.post(
        `${likeUnlikeUrl}?type=unlike`,
        unlikeReq
      );
    } catch (err) {
      setError("Failed to react.");
    } 
  };

  const fetchPosts = async (loadMore = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const timelineHomeReq = nextToken
        ? new TimelineHomeReq(nextToken, 10)
        : new TimelineHomeReq(10);
      const axiosTimelineHomeResp = await axiosAuthClient.post(
        timelineUrl,
        timelineHomeReq
      );

      const timelineHomeResObj = plainToInstance(
        TimelineHomeRes,
        axiosTimelineHomeResp.data
      );

      const postIds = timelineHomeResObj.posts.map((tpost) => tpost.postId);

      const getPostsReq = new GetPostReq(postIds, true);
      const axiosGetPostsResp = await axiosAuthClient.post(
        getPostsUrl,
        getPostsReq
      );

      const postDetailsResObj = plainToInstance(
        PostDetailsRes,
        axiosGetPostsResp.data
      );

      const singlePostMap: Map<string, SinglePost> = new Map(
        postDetailsResObj.posts.map((post) => [post.postId, post])
      );
      const postsAsTimelinePostOrder = postIds
        .map((id) => singlePostMap.get(id))
        .filter((obj) => obj !== undefined) as SinglePost[];

      setPosts((prev) =>
        loadMore
          ? [...prev, ...postsAsTimelinePostOrder]
          : postsAsTimelinePostOrder
      );
      setNextToken(timelineHomeResObj.paging?.nextToken || null);
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
