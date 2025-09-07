"use client";

import React, { useEffect, useState } from "react";
import { SinglePost } from "@tareqjoy/models";
import { axiosAuthClient } from "@/lib/auth";

interface Props {
  post: SinglePost;
}

const getAttachmentUrl =
  process.env.NEXT_PUBLIC_GET_ATTACHMENT_URL ||
  "http://localhost:80/v1/file/attachment";

const NormalPostBody: React.FC<Props> = ({ post }) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!post.attachments || post.attachments.length === 0) return;

    const fetchImages = async () => {
      try {
        const urls = await Promise.all(
          post.attachments!.map(async (att) => {
            try {
              const response = await axiosAuthClient.get(
                `${getAttachmentUrl}/${att.attachmentId}`,
                {
                  params: { variant: "medium" },
                  responseType: "blob",
                }
              );
              return URL.createObjectURL(response.data);
            } catch (err) {
              console.error(`Failed to load image ${att.attachmentId}`, err);
              return null;
            }
          })
        );

        setImageUrls(urls.filter((url): url is string => url !== null));
      } catch (err) {
        console.error("Failed to load images", err);
      }
    };

    fetchImages();

    // cleanup object URLs
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [post.attachments]);

  return (
    <div className="mt-2 mb-2 space-y-2">
      <p>{post.body}</p>
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`post image ${idx}`}
              className="rounded-lg object-cover w-full max-h-96"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NormalPostBody;
