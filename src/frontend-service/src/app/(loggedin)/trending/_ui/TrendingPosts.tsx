"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient } from "@/lib/auth";
import {
  GetPostReq,
  PostDetailsRes,
  SinglePost,
  TrendingReq,
  TrendingRes,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import PostFeed from "../../_ui/PostFeed";
import usePostReactions from "@/hooks/use-post-reactions";

const trendingUrl: string =
  process.env.NEXT_PUBLIC_TRENDING_URL || "/v1/timeline/trending";
const getPostsUrl: string =
  process.env.NEXT_PUBLIC_GET_POSTS_URL || "/v1/post/get";

const windowOptions = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "30d", value: "30d" },
];

export default function TrendingPosts({ username }: { username: string }) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [windowValue, setWindowValue] = useState<string>("24h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleReact, handleUnreact } = usePostReactions({
    setPosts,
    setError,
  });

  const fetchTrending = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const trendingReq = new TrendingReq(windowValue, 20);
      const axiosTrendingResp = await axiosAuthClient.get(trendingUrl, {
        params: {
          window: trendingReq.window,
          limit: trendingReq.limit,
        },
      });

      const trendingResObj = plainToInstance(
        TrendingRes,
        axiosTrendingResp.data,
      );

      const postIds = trendingResObj.posts.map((tpost) => tpost.postId);
      if (postIds.length === 0) {
        setPosts([]);
        return;
      }

      const getPostsReq = new GetPostReq(postIds, true);
      const axiosGetPostsResp = await axiosAuthClient.post(
        getPostsUrl,
        getPostsReq,
      );

      const postDetailsResObj = plainToInstance(
        PostDetailsRes,
        axiosGetPostsResp.data,
      );

      const singlePostMap: Map<string, SinglePost> = new Map(
        postDetailsResObj.posts.map((post) => [post.postId, post]),
      );
      const postsAsTrendingOrder = postIds
        .map((id) => singlePostMap.get(id))
        .filter((obj) => obj !== undefined) as SinglePost[];

      setPosts(postsAsTrendingOrder);
    } catch (err) {
      setError("Failed to load trending posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [windowValue]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {windowOptions.map((option) => (
          <button
            key={option.value}
            className={`px-3 py-1 rounded-full border text-sm ${
              windowValue === option.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
            }`}
            onClick={() => setWindowValue(option.value)}
            disabled={loading}
          >
            {option.label}
          </button>
        ))}
      </div>

      <PostFeed
        posts={posts}
        error={error}
        loading={loading}
        nextToken={null}
        loggedInUsername={username}
        onReact={handleReact}
        onUnreact={handleUnreact}
        onLoadMore={() => {}}
        emptyMessage="No trending posts yet."
      />
    </div>
  );
}
