"use client";
import { useEffect, useState } from "react";
import { authGet, authPost } from "@/lib/auth";
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
const DEFAULT_WINDOW = "1h";
const WINDOW_STORAGE_KEY = "trending.window";
const isValidWindow = (value: string) =>
  windowOptions.some((option) => option.value === value);

export default function TrendingPosts({ username }: { username: string }) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [windowValue, setWindowValue] = useState<string>(DEFAULT_WINDOW);
  const [isReady, setIsReady] = useState(false);
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
      const axiosTrendingResp = await authGet(trendingUrl, {
        params: {
          window: trendingReq.window,
          limit: trendingReq.limit,
        },
      });

      console.info("Fetched trending data:", axiosTrendingResp);

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
      const axiosGetPostsResp = await authPost(
        getPostsUrl,
        getPostsReq,
      );

      console.info("Fetched get posts data:", axiosGetPostsResp.data);

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
      console.error("Error fetching trending posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWindow = window.localStorage.getItem(WINDOW_STORAGE_KEY);
    if (savedWindow && isValidWindow(savedWindow)) {
      setWindowValue(savedWindow);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WINDOW_STORAGE_KEY, windowValue);
    }
    fetchTrending();
  }, [windowValue, isReady]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 p-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur border border-white/70 dark:border-white/10 shadow-sm w-fit">
        {windowOptions.map((option) => (
          <button
            key={option.value}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              windowValue === option.value
                ? "btn-primary"
                : "btn-secondary"
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
