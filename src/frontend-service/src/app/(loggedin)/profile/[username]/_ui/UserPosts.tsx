"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient, getUserName } from "@/lib/auth";
import {
  GetPostByUserReq,
  PostDetailsRes,
  SinglePost,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import PostFeed from "../../../_ui/PostFeed";
import usePostReactions from "@/hooks/use-post-reactions";

const userPostsUrl: string =
  process.env.NEXT_PUBLIC_USER_POSTS_URL ||
  "/v1/post/get-by-user";

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

  const { handleReact, handleUnreact } = usePostReactions({
    setPosts,
    setError,
  });

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
          returnAsUsername: true,
          limit: 10,
        }
      );
      const axiosResp = await axiosAuthClient.post(userPostsUrl, postByUserReq);

      const postDetailsResObj = plainToInstance(PostDetailsRes, axiosResp.data);

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
    <PostFeed
      posts={posts}
      error={error}
      loading={loading}
      nextToken={nextToken}
      loggedInUsername={getUserName()!}
      onReact={handleReact}
      onUnreact={handleUnreact}
      onLoadMore={() => fetchPosts(true)}
    />
  );
}
