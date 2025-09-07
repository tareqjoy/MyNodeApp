"use client";

import React from "react";
import { SinglePost } from "@tareqjoy/models";
import NormalPostBody from "./PostCardBodyNormal";
import ProfilePhotoPostBody from "./PostCardBodyProfilePhoto";

interface Props {
  post: SinglePost;
}

const PostBodyFactory: React.FC<Props> = ({ post }) => {
  switch (post.postType) {
    case "normal":
      return <NormalPostBody post={post} />;
    case "profile_photo":
      return <ProfilePhotoPostBody post={post} />;
    default:
      return (
        <p className="mt-2 mb-2 text-gray-500 italic">
          Unsupported post type: {post.postType}
        </p>
      );
  }
};

export default PostBodyFactory;
