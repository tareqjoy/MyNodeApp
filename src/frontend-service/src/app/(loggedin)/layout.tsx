

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
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await useVerifyAccessToken();
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        setUserData(getUserName() || '');
        console.log("user data: " + getUserName());
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
    } finally {
        setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
<div className="flex flex-col h-screen">
  {/* Top Bar */}
  { 
    <header className="w-full bg-gray-900 text-white flex items-center justify-between px-6 py-4 shadow-md">
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search..."
        className="w-1/3 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Navigation Buttons */}
      <div className="flex items-center space-x-4">
        {/* Home Button */}
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition shadow-md"
        >
          Home
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            <span>{userData}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 shadow-lg rounded-lg">
              <button
                onClick={handleLogOut}
                className="block w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  }

  {/* Main Content */}
  <main className="flex-grow overflow-y-auto">{children}</main>
</div>

  );
}
