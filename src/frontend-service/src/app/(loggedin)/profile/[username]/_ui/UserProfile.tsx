"use client";

import React from "react";
import Image from "next/image";

interface UserProfileProps {
  username: string;
  name: string;
  email: string;
  birthDay: string;
  followState: "hide" | "following" | "unfollowing";
  onFollowToggle: () => void;
}

export default function UserProfile({
  username,
  name,
  email,
  birthDay,
  followState,
  onFollowToggle,
}: UserProfileProps) {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white bg-opacity-80 rounded-lg shadow-md overflow-hidden">
      {/* Cover Photo */}
      <div className="relative w-full max-h-[300px] h-64">
        <Image
          src={"/profile_cover.jpg"}
          alt="Cover Photo"
          layout="fill"
          objectFit="cover"
          className="w-full"
        />
      </div>

      {/* Profile Info */}
      <div className="p-6 flex items-center gap-6 relative">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white -mt-16 shadow-lg">
          <Image
            src={"/profile_pic.png"}
            alt={name}
            width={96}
            height={96}
            className="rounded-full object-cover"
          />
        </div>

        {/* User Info */}
        <div className="flex flex-col">
          <h2 className="text-gray-600 text-2xl font-semibold">{name}</h2>
          <p className="text-gray-600">@{username}</p>
          <p className="text-gray-500">{email}</p>
          <p className="text-gray-500">Birthday {birthDay}</p>
        </div>

        {/* Follow Button */}
        {followState !== "hide" && (
          <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
            <button
              onClick={onFollowToggle} // Toggle follow on button click
              className={`${
                followState === "following" ? "bg-gray-400" : "bg-blue-500"
              } text-white py-2 px-4 rounded-full hover:bg-blue-600 focus:outline-none`}
            >
              {followState === "following" ? "Unfollow" : "Follow"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
