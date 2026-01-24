'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { UserDetailsRes } from '@tareqjoy/models';
import { axiosAuthClient,  getUserId, getUserName } from '@/lib/auth';
import { plainToInstance } from 'class-transformer';
import ProfilePost from './_ui/ProfilePost';
import TimelinePosts from './_ui/TimelinePosts';

const userDetailsUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "/v1/user/detail";


export default function ProfilePage() {
  const [user, setUser] = useState<UserDetailsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'ifollow'>('posts'); 

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const axiosResp = await axiosAuthClient.get(`${userDetailsUrl}/${getUserId()!}`, {
          params: { provided: "userid"}
        });
        const userDetailsResObj = plainToInstance(UserDetailsRes, axiosResp.data);
        setUser(userDetailsResObj);
      } catch (err) {
        setError("Failed to load user data.");
      } finally {
        setLoading(false);
      }

    };
    fetchUser();
  }, []);

  if (loading) return <p className="text-gray-500 animate-pulse text-center mt-4">Loading...</p>;
  if (error) return <p className="text-red-500 text-center mt-4">{error}</p>;
  if (!user) return <p className="text-gray-500 text-center mt-4">No user data available.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Info */}

      <div className=" rounded-lg shadow">
        <ProfilePost />
      </div>

      <TimelinePosts username={getUserName()!} />
    </div>
  );
};
