'use client'
import 'reflect-metadata';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient, axiosPublicClient, deleteAccessToken, deleteRefreshToken, getUserName } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from "next/navigation";
import Loading from './loading';

const authSignOutUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_URL || "http://127.0.0.1:80/v1/auth/signout/";
const userDetailsUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://127.0.0.1:80/v1/user/detail/";

const deviceId = 'some-unique-device-id';

export default function Layout({ children }: { children: React.ReactNode }) {
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
        setUserData(getUserName() || '');
      }
    };
    isAuthed();
  }, [showProfile]);

  if(!showProfile) {
    return (<Loading />)
  }

  
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
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
      <button>{userData}</button>
      </div>
      <div className="flex-grow p-6 md:overflow-y-auto md:p-12">{children}</div>
      <div className="w-full flex-none md:w-64">
      <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }} onClick={handleLogOut}>Log out</button>
      </div>
    </div>
  );
}