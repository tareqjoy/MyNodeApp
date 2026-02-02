"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient } from "@/lib/auth";
import {
  GetPostReq,
  PostDetailsRes,
  SinglePost,
  TimelineHomeReq,
  TimelineHomeRes,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import PostFeed from "../../_ui/PostFeed";
import usePostReactions from "@/hooks/use-post-reactions";

const timelineUrl: string =
  process.env.NEXT_PUBLIC_TIMELINE_HOME_URL ||
  "/v1/timeline/home";
const getPostsUrl: string =
  process.env.NEXT_PUBLIC_GET_POSTS_URL || "/v1/post/get";

export default function TimelinePosts({ username }: { username: string }) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleReact, handleUnreact } = usePostReactions({
    setPosts,
    setError,
  });

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
    <PostFeed
      posts={posts}
      error={error}
      loading={loading}
      nextToken={nextToken}
      loggedInUsername={username}
      onReact={handleReact}
      onUnreact={handleUnreact}
      onLoadMore={() => fetchPosts(true)}
    />
  );
}
