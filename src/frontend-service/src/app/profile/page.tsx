'use client'
import 'reflect-metadata';
import { useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient, deleteAccessToken, deleteRefreshToken } from '@/lib/auth';

const authSignOutUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_URL || "http://127.0.0.1:5007/v1/auth/signout/";
const deviceId = 'some-unique-device-id';

const ProfilePage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  useVerifyAccessToken(undefined, '/login');

  // Function to handle form submission
  const handleLogOut = async () => {

    try {
      const resp = await axiosAuthClient.post(authSignOutUrl, {}, {headers: {'Device-ID': deviceId}});
      deleteAccessToken();
      deleteRefreshToken();
      window.location.reload();
    } catch (error) {

      console.error('Auth failed:', error);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
    <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }} onClick={handleLogOut}>Log out</button>
    </div>
  );
};

export default ProfilePage;
