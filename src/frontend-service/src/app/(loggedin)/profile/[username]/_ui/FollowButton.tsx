import React from "react";

interface FollowButtonProps {
  isFollowing: boolean;
  onFollowToggle: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({ isFollowing, onFollowToggle }) => {
  return (
    <button
      onClick={onFollowToggle}
      className={`py-2 px-4 rounded-full ${
        isFollowing ? "bg-red-500 text-white" : "bg-blue-500 text-white"
      }`}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
};

export default FollowButton;
