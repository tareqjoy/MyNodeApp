'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { axiosAuthClient, axiosPublicClient, getRefreshToken, setAccessToken, setRefreshToken, setUserId, setUserName } from '@/lib/auth';
import { AuthSignInReq, AuthSignInRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import Loading from './loading';
import error from 'next/error';
import Image from 'next/image';

const authSignInUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_IN_URL || "http://localhost:80/v1/auth/signin/";
const userIdUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://localhost:80/v1/user/userid/";
const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "http://localhost:80/v1/auth/verify/";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsernameInForm] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const isAuthed = async () => {
      console.log("Checking authentication...");
      if(!getRefreshToken()) {
        console.log("User is not authenticated, showing login form...");
        setShowLoginForm(true);
        return;
      }
      try {
        const resp = await axiosAuthClient.post(authVerifyUrl, {});
        if (resp.status === 200) {
          console.log("User is authenticated, redirecting to profile...");
          router.push('/home');
          return;
        }
      } catch (error) {
        console.log("User is not authenticated, showing login form...");
      }
      setShowLoginForm(true);
    };

    isAuthed();
  }, [router]);

  // Show loading screen while checking auth status
  if (!showLoginForm) {
    return <Loading />;
  }

  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const deviceId = 'some-unique-device-id';
      const signInReq = new AuthSignInReq({ username }, password);

      const signInRes = await axiosPublicClient.post(authSignInUrl, signInReq, {
        headers: { 'Device-ID': deviceId },
      });

      if (signInRes.status === 200) {
        const authSignInResObj = plainToInstance(AuthSignInRes, signInRes.data);
        setAccessToken(authSignInResObj.access_token);
        setRefreshToken(authSignInResObj.refresh_token);
        setUserName(username);

        const usernameRes = await axiosAuthClient.post(userIdUrl, { username });
        setUserId(usernameRes.data.toUserIds[username]);

        // Redirect user to previous page or profile
        const callerPage = searchParams.get('callerPage');
        if (callerPage) {
          const urlParams = new URLSearchParams(searchParams);
          urlParams.delete('callerPage');

          const redirectUrl = `${callerPage}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          router.push(redirectUrl);
        } else {
          router.push('/home');
        }
      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage('Login failed. Please check your credentials.');
    }
  };

  return (
<div className="relative h-screen w-full bg-cover bg-center flex items-center justify-center" 
      style={{ backgroundImage: "url('/login-bg.jpg')" }}>
      {/* Overlay */}
      

      {/* Login Form */}
      <div className="relative z-10 bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-semibold text-center text-gray-800">Welcome Back</h2>
        <p className="text-gray-500 text-center mb-6">Sign in to your account</p>

        {error && <p className="text-red-500 text-sm text-center mb-4">{errorMessage}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium">Email</label>
            <input
              type="username"
              value={username}
              onChange={(e) => setUsernameInForm(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-gray-700 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <a href="#" className="text-blue-500 text-sm hover:underline">Forgot password?</a>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-gray-600 text-sm text-center mt-4">
          Don't have an account? <a href="/register" className="text-blue-500 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
