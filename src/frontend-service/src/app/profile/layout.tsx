'use client';
import 'reflect-metadata';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { getUserName, deleteAccessToken, deleteRefreshToken, axiosAuthClient } from '@/lib/auth';
import Loading from './loading';

const authSignOutUrl = process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_URL || 'http://localhost:80/v1/auth/signout/';
const deviceId = 'some-unique-device-id';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userData, setUserData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await useVerifyAccessToken();
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setUserData(getUserName() || '');
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogOut = async () => {
    try {
      await axiosAuthClient.post(authSignOutUrl, {}, { headers: { 'Device-ID': deviceId } });
      deleteAccessToken();
      deleteRefreshToken();
      router.push('/login');
    } catch (error) {
      console.error('Auth failed:', error);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 p-6 bg-gray-800 text-white flex flex-col items-center">
        <span className="text-lg font-semibold">{userData}</span>
        <button
          className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
          onClick={handleLogOut}
        >
          Log Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto">{children}</main>
    </div>
  );
}
