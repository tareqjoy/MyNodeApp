'use client'
import 'reflect-metadata';
import { Suspense, useEffect, useState } from 'react';
import { UserDetailsRes } from '@tareqjoy/models';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient, deleteAccessToken, deleteRefreshToken, getUserId, getUserName } from '@/lib/auth';
import { useRouter } from "next/navigation";
import Loading from './loading';
import UserProfile from "./_ui/UserProfile";
import { plainToInstance } from 'class-transformer';

const userDetailsUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://localhost:80/v1/user/detail";


export default function ProfilePage() {
  const [user, setUser] = useState<UserDetailsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const axiosResp = await axiosAuthClient.get(`${userDetailsUrl}/${getUserId()}`, {
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

  if (loading) return <p className="text-gray-500 animate-pulse">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!user) return <p className="text-gray-500">No user data available.</p>;

  return (
    <div className="flex justify-center">
      <UserProfile username={user.username} name={user.name} email={user.email} birthYear={user.birthYear || 0} />
    </div>
  );
};
