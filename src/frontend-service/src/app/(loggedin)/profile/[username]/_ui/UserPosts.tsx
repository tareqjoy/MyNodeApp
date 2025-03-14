'use client';
import { useEffect, useState } from 'react';
import { axiosAuthClient } from '@/lib/auth';
import { GetPostByUserReq, PostDetailsRes, SinglePost } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';

const userPostsUrl: string = process.env.NEXT_PUBLIC_USER_POSTS_URL || "http://localhost:80/v1/post/get-by-user";


export default function UserPosts({ userIdOrName, isProvidedUsername }: { userIdOrName: string; isProvidedUsername: boolean }) {
  const [posts, setPosts] = useState<SinglePost[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async (loadMore = false) => {
    if (loading) return;

    setLoading(true);
    try {
        const postByUserReq = new GetPostByUserReq([userIdOrName], isProvidedUsername, {nextToken: nextToken || undefined, returnOnlyPostId: false, limit: 10});
      const axiosResp = await axiosAuthClient.post(userPostsUrl, postByUserReq);

      const postDetailsResObj = plainToInstance(PostDetailsRes, axiosResp.data);

      setPosts((prev) => loadMore ? [...prev, ...postDetailsResObj.posts] : postDetailsResObj.posts);
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
      {posts.length === 0 && !loading && <p className="text-gray-500">No posts available.</p>}

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.postId} className="p-4 border rounded-lg shadow-sm">
            <p className="text-sm text-gray-600">{new Date(post.time).toLocaleString()}</p>
            <p className="text-gray-400 ">{post.body}</p>
            
          </div>
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
