import React from "react";

interface UserProfileProps {
 username: string;
  name: string;
  email: string;
  birthYear: number;
}

export default function UserProfile({ username, name, email, birthYear }: UserProfileProps) {
  return (
    <div className="border rounded-lg p-4 shadow-md bg-white">
      <h2 className="text-xl font-semibold text-center">{username}</h2>
      <h2 className="text-xl font-semibold text-center">{name}</h2>
      <p className="text-gray-500 text-center">{email}</p>
      <p className="text-gray-500 text-center">{birthYear}</p>
    </div>
  );
}