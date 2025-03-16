"use client";
import "reflect-metadata";
import { useEffect, useState } from "react";
import {
  DoIFollowResponse,
  FollowReq,
  UnfollowReq,
  UserDetailsRes,
} from "@tareqjoy/models";
import { axiosAuthClient, getUserId } from "@/lib/auth";
import UserProfile from "./_ui/UserProfile";
import { plainToInstance } from "class-transformer";
import UserPosts from "./_ui/UserPosts";
import UserFollows from "./_ui/UserFollows";
import ProfilePost from "./_ui/ProfilePost";
import { use } from "react";
import { useSearchParams } from "next/navigation";

const userDetailsUrl: string =
  process.env.NEXT_PUBLIC_USER_DETAILS_URL ||
  "http://localhost:80/v1/user/detail";
const doIFollowUrl: string =
  process.env.NEXT_PUBLIC_DO_I_FOLLOW_URL ||
  "http://localhost:80/v1/follower/do-i-follow/";
const followUrl: string =
  process.env.NEXT_PUBLIC_FOLLOW_URL ||
  "http://localhost:80/v1/follower/follow";
const unfollowUrl: string =
  process.env.NEXT_PUBLIC_UNFOLLOW_URL ||
  "http://localhost:80/v1/follower/unfollow";

const userIdUrl: string =
  process.env.NEXT_PUBLIC_USER_ID_URL || "http://localhost:80/v1/user/userid";

interface ProfilePageProps {
  username: string;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<ProfilePageProps>;
}) {
  const searchParams = useSearchParams();

  const { username } = use(params);
  const provided = searchParams.get("provided");

  const usernameOrId = username ? username : getUserId()!;
  const isProvidedUsername = provided !== "userid";

  const [user, setUser] = useState<UserDetailsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"posts" | "ifollow">("posts");
  const [isItMe, setIsItMe] = useState<boolean>(false);
  const [followingState, setFollowingState] = useState<
    "hide" | "following" | "unfollowing"
  >("hide");

  const handleFollowToggle = async () => {
    let followUnfollowUrl;
    let followUnfollowObj: FollowReq | UnfollowReq;
    if (followingState === "following") {
      followUnfollowUrl = unfollowUrl;
      followUnfollowObj = new UnfollowReq(username);
    } else {
      followUnfollowUrl = followUrl;
      followUnfollowObj = new FollowReq(username, Date.now());
    }
    try {
      const axiosFollowUnfollowResp = await axiosAuthClient.post(
        followUnfollowUrl,
        followUnfollowObj
      );
      if(axiosFollowUnfollowResp.status === 200) {
        setFollowingState((prevState) => prevState==="following"? "unfollowing" : "following");
      }
    }catch (err) {
      console.warn("failed to follow or unfollow", err);
    } finally {
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const axiosUserDetailsResp = await axiosAuthClient.get(
          `${userDetailsUrl}/${usernameOrId}`,
          {
            params: { provided: isProvidedUsername ? "username" : "userid" },
          }
        );
        const userDetailsResObj = plainToInstance(
          UserDetailsRes,
          axiosUserDetailsResp.data
        );
        setUser(userDetailsResObj);

        setIsItMe(userDetailsResObj.userId === getUserId()!);

        if (userDetailsResObj.userId === getUserId()) {
          setFollowingState("hide");
        } else {
          const axiosDoIFollowResp = await axiosAuthClient.get(
            `${doIFollowUrl}/${userDetailsResObj.userId}`
          );
          const doIFollowResObj = plainToInstance(
            DoIFollowResponse,
            axiosDoIFollowResp.data
          );

          setFollowingState(
            doIFollowResObj.doIFollow ? "following" : "unfollowing"
          );
        }
      } catch (err) {
        setError("Failed to load user data.");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading)
    return (
      <p className="text-gray-500 animate-pulse text-center mt-4">Loading...</p>
    );
  if (error) return <p className="text-red-500 text-center mt-4">{error}</p>;
  if (!user)
    return (
      <p className="text-gray-500 text-center mt-4">No user data available.</p>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Info */}
      <UserProfile
        username={user.username}
        name={user.name}
        email={user.email}
        birthDay={user.birthDay}
        followState={followingState}
        onFollowToggle={handleFollowToggle}
      />

      {/* Conditionally render ProfilePost if isItMe is true */}
      {isItMe && (
        <div className="rounded-lg shadow">
          <ProfilePost />
        </div>
      )}
      {/* Tabs for Posts & Friends */}
      {isItMe && (
        <div className="flex border-b">
          <button
            className={`flex-1 py-2 text-center font-medium ${
              selectedTab === "posts"
                ? "border-b-4 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setSelectedTab("posts")}
          >
            Posts
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium ${
              selectedTab === "ifollow"
                ? "border-b-4 border-blue-500 text-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setSelectedTab("ifollow")}
          >
            Following
          </button>
        </div>
      )}
      {/* Tab Content */}
      {isItMe ? (
        selectedTab === "posts" ? (
          <UserPosts
            userIdOrName={usernameOrId}
            isProvidedUsername={isProvidedUsername}
          />
        ) : (
          <UserFollows />
        )
      ) : (
        <UserPosts
          userIdOrName={usernameOrId}
          isProvidedUsername={isProvidedUsername}
        />
      )}
    </div>
  );
}
