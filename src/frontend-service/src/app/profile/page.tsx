'use client'
import 'reflect-metadata';
import { Suspense, useEffect, useState } from 'react';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient, deleteAccessToken, deleteRefreshToken } from '@/lib/auth';
import { useRouter } from "next/navigation";
import Loading from './loading';

const authSignOutUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_URL || "http://127.0.0.1:5007/v1/auth/signout/";
const userDetailsUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://127.0.0.1:5002/v1/auth/signout/";
const deviceId = 'some-unique-device-id';

export default function ProfilePage() {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [userData, setUserData] = useState('');
  
  
  useEffect(() => {
    const isAuthed = async () => {
      const data = await useVerifyAccessToken();
      if(!data) {
        router.push('/login')
      } else {
        setShowProfile(true);
        setUserData(data);
      }
    };
    isAuthed();
  }, [showProfile]);

  if(!showProfile) {
    return (<Loading />)
  }

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
    <p>{userData.userId}</p>
    <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }} onClick={handleLogOut}>Log out</button>
    </div>
  );
};
