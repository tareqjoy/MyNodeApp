import React from "react";

interface UserProfileProps {
 username: string;
  name: string;
  email: string;
  birthYear: number;
}

export default function UserProfile({ username, name, email, birthYear }: UserProfileProps) {
  return (
    <div className="border rounded-lg p-6 shadow-md bg-white text-center">
      <h2 className="text-2xl font-semibold">{username}</h2>
      <p className="text-gray-700">{name}</p>
      <p className="text-gray-500">{email}</p>
      <p className="text-gray-500">{birthYear}</p>
    </div>
  );
}