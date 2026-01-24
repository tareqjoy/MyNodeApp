"use client";

import React, { useEffect, useState } from "react";
import { SinglePost } from "@tareqjoy/models";
import { axiosAuthClient } from "@/lib/auth";

interface Props {
  post: SinglePost;
}

const getAttachmentUrl =
  process.env.NEXT_PUBLIC_GET_ATTACHMENT_URL ||
  "/v1/file/attachment";

const ProfilePhotoPostBody: React.FC<Props> = ({ post }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      if (!post.attachments?.[0]) return;

      try {
        const singleAttachment = post.attachments[0];
        // Replace with your API endpoint to fetch attachment by ID
        const response = await axiosAuthClient.get(
          `${getAttachmentUrl}/${singleAttachment.attachmentId}`,
          {
            params: { variant: "medium" },
            responseType: "blob", // important to get image data
          }
        );

        // Create a local object URL
        const url = URL.createObjectURL(response.data);
        setImageUrl(url);
      } catch (err) {
        console.error("Failed to load image", err);
      }
    };

    fetchImage();

    // Optional: clean up object URL when component unmounts
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [post.attachments]);

  return (
    <div className="mt-2 mb-2 space-y-2">
      <p>{post.body}</p>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="profile photo"
          className="rounded-lg object-cover w-full max-h-96"
        />
      )}
    </div>
  );
};

export default ProfilePhotoPostBody;
