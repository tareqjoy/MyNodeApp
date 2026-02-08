"use client";
import { useEffect, useState } from "react";
import { authPost } from "@/lib/auth";
import { FollowersReq, FollowersRes } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import Link from "next/link";
import StateMessage from "../../../_ui/StateMessage";

const iFollowUrl =
  process.env.NEXT_PUBLIC_USER_FRIENDS_URL ||
  "/v1/follower/i-follow";

export default function UserFollows() {
  const [ifollow, setIFollow] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIFollows = async () => {
      try {
        const iFollowObj = new FollowersReq(true);
        const axiosResp = await authPost(iFollowUrl, iFollowObj);
        const postDetailsResObj = plainToInstance(FollowersRes, axiosResp.data);
        if (postDetailsResObj.usernames) {
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

  if (loading) {
    return <StateMessage variant="loading" message="Loading..." center={false} />;
  }

  if (error) {
    return <StateMessage variant="error" message={error} center={false} />;
  }

  return (
    <div className="w-full max-w-5xl mt-6">
      {ifollow.length === 0 ? (
        <StateMessage variant="empty" message="None!" center={false} />
      ) : (
        <div className="rounded-2xl border border-white/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-white/70 dark:border-white/10">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Following ({ifollow.length})
            </p>
          </div>
          <ul className="divide-y divide-white/70 dark:divide-white/10">
            {ifollow.map((friend) => (
              <li key={friend}>
                <Link
                  href={`/profile/${friend}`}
                  className="group flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50/80 dark:hover:bg-white/10"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-semibold">
                    {friend[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {friend}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      View profile
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
