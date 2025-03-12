'use client'
import { useEffect, useState } from 'react';
import { axiosAuthClient } from '@/lib/auth';
import { FollowersReq, FollowersRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';

const iFollowUrl = process.env.NEXT_PUBLIC_USER_FRIENDS_URL || "http://localhost:80/v1/follower/i-follow";

export default function UserFollows() {
  const [ifollow, setIFollow] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIFollows = async () => {
      try {
        const iFollowObj = new FollowersReq(true);
        const axiosResp = await axiosAuthClient.post(iFollowUrl, iFollowObj);
        const postDetailsResObj = plainToInstance(FollowersRes, axiosResp.data);
        if(postDetailsResObj.usernames) {
            setIFollow(postDetailsResObj.usernames!);
        } else {
            setError("Failed to load i'm following.");
        }
      } catch (err) {
        setError("Failed to load i'm following.");
      } finally {
        setLoading(false);
      }
    };
    fetchIFollows();
  }, []);

  if (loading) return <p className="text-gray-500 animate-pulse">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="w-full max-w-5xl mt-6">
      {ifollow.length === 0 ? (
        <p className="text-gray-500">None!</p>
      ) : (
        <ul className="space-y-4">
          {ifollow.map((friend) => (
            <li key={friend} className="p-4 border rounded-lg shadow-sm">
              <p className="text-gray-800">{friend}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
