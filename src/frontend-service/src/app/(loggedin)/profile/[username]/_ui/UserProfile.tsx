"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Camera } from "lucide-react"; // You can replace this with any camera icon or svg.
import ConfirmDialog from "@/app/_ui/ConfirmDialog";

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
  const [changePhotoDialogType, setChangePhotoDialogType] = useState<"cover" | "avatar" | null>(
    null
  );
  const [confirmDeleteDialogType, setConfirmDeleteDialogType] = useState<
    "avatar" | "cover" | null
  >(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Close dialog on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        setChangePhotoDialogType(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto bg-white bg-opacity-80 rounded-lg shadow-md overflow-visible relative">
      {/* Cover Photo */}
      <div className="relative w-full max-h-[300px] h-64 group">
        <Image
          src={"/profile_cover.jpg"}
          alt="Cover Photo"
          layout="fill"
          objectFit="cover"
          className="w-full"
        />

        {/* Camera Icon */}
        <div
          className={`absolute bottom-2 right-2 p-2 bg-black bg-opacity-50 rounded-full cursor-pointer transition ${
            changePhotoDialogType === "cover"
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setChangePhotoDialogType((prev) => (prev === "cover" ? null : "cover"));
          }}
        >
          <Camera className="text-white w-5 h-5" />
        </div>

        {/* Dialog */}
        {changePhotoDialogType === "cover" && (
          <div
            ref={dialogRef}
            className="absolute bottom-14 right-2 bg-white border shadow-lg rounded-md z-10"
          >
            <button
              className="block px-4 py-2 hover:bg-gray-100 w-full text-left text-gray-700"
              onClick={() => {
                document.getElementById("coverUpload")?.click();
                setChangePhotoDialogType(null);
              }}
            >
              Change Photo
            </button>
            <button
              className="block px-4 py-2 hover:bg-gray-100 w-full text-left text-red-500"
              onClick={() => setConfirmDeleteDialogType("cover")}
            >
              Delete Photo
            </button>
          </div>
        )}
        {/* Hidden file input for cover */}
        <input
          id="coverUpload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // TODO: upload or preview
              console.log("Selected cover image:", file);
            }
          }}
        />
      </div>

      {/* Profile Info */}
      <div className="p-6 flex items-center gap-6 relative">
        {/* Avatar Wrapper */}
        <div className="relative flex flex-col items-center -mt-16">
          {/* Avatar Image with hover group */}
          <div className="group w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative">
            <Image
              src={"/profile_pic.png"}
              alt={name}
              width={96}
              height={96}
              className="rounded-full object-cover"
            />

            {/* Hover Camera Icon */}
            <div
              className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full p-1 cursor-pointer opacity-0 group-hover:opacity-100 transition ${
                changePhotoDialogType === "avatar"
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setChangePhotoDialogType((prev) =>
                  prev === "avatar" ? null : "avatar"
                );
              }}
            >
              <Camera className="text-white w-4 h-4" />
            </div>
          </div>

          {/* Dialog for Avatar - placed below avatar */}
          {changePhotoDialogType === "avatar" && (
            <div
              ref={dialogRef}
              className="absolute top-[105%] bg-white border shadow-lg rounded-md"
            >
              <button
                className="block px-4 py-2 hover:bg-gray-100 w-35 text-left text-gray-700"
                onClick={() => {
                  document.getElementById("avatarUpload")?.click();
                  setChangePhotoDialogType(null);
                }}
              >
                Change Photo
              </button>
              <button
                className="block px-4 py-2 hover:bg-gray-100 w-35 text-left text-red-500"
                onClick={() => setConfirmDeleteDialogType("avatar")}
              >
                Delete Photo
              </button>
            </div>
          )}
          {/* Hidden file input for avatar */}
          <input
            id="avatarUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // TODO: upload or preview
                console.log("Selected avatar image:", file);
              }
            }}
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
              onClick={onFollowToggle}
              className={`${
                followState === "following" ? "bg-gray-400" : "bg-blue-500"
              } text-white py-2 px-4 rounded-full hover:bg-blue-600 focus:outline-none`}
            >
              {followState === "following" ? "Unfollow" : "Follow"}
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        show={!!confirmDeleteDialogType}
        onClose={() => {}}
        question={`Are you sure you want to delete the ${confirmDeleteDialogType} photo?`}
        onConfirm={() => {
          console.log(`Deleting ${confirmDeleteDialogType} photo...`);
          setConfirmDeleteDialogType(null);
        }}
        onCancel={() => setConfirmDeleteDialogType(null)} 
      />
    </div>
  );
}
