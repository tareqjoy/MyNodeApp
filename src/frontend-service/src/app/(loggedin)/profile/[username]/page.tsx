'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { UserDetailsRes } from '@tareqjoy/models';
import { axiosAuthClient,  getUserId } from '@/lib/auth';
import UserProfile from "./_ui/UserProfile";
import { plainToInstance } from 'class-transformer';
import UserPosts from './_ui/UserPosts';
import UserFollows from './_ui/UserFollows';
import ProfilePost from './_ui/ProfilePost';
import { use } from 'react';

const userDetailsUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://localhost:80/v1/user/detail";

interface ProfilePageProps {
  username: string;
}

export default function ProfilePage({ params }: { params: Promise<ProfilePageProps> }) {
  const { username } = use(params);
  
  const [user, setUser] = useState<UserDetailsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'ifollow'>('posts'); 

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const usernameToLoad = username ? username : getUserId()!;
        const axiosResp = await axiosAuthClient.get(`${userDetailsUrl}/${usernameToLoad}`);
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
      <UserProfile username={user.username} name={user.name} email={user.email} birthYear={user.birthYear || 0} />

      <div className=" rounded-lg shadow">
        <ProfilePost />
      </div>

      {/* Tabs for Posts & Friends */}
      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 text-center font-medium ${selectedTab === 'posts' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`flex-1 py-2 text-center font-medium ${selectedTab === 'ifollow' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setSelectedTab('ifollow')}
        >
          Following
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'posts' ? <UserPosts userId={getUserId()!} /> : <UserFollows />}
    </div>
  );
};
