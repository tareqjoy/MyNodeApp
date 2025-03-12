import React from "react";
import Image from "next/image";

interface UserProfileProps {
 username: string;
  name: string;
  email: string;
  birthYear: number;
}

export default function UserProfile({ username, name, email, birthYear }: UserProfileProps) {
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
    <p className="text-gray-500">Born in {birthYear}</p>
  </div>
</div>
</div>
  );
}