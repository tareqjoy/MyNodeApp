"use client";
import { useEffect, useState } from "react";
import { axiosAuthClient } from "@/lib/auth";
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
        const axiosResp = await axiosAuthClient.post(iFollowUrl, iFollowObj);
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
        <ul className="space-y-4">
          {ifollow.map((friend) => (
            <Link
              key={friend}
              href={`/profile/${friend}`}
              className="block p-4 border rounded-lg shadow-sm hover:bg-gray-100 transition"
            >
              <p className="text-gray-800">{friend}</p>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
