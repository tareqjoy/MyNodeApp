'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authPost, getOrCreateDeviceId, publicPost, setAccessToken, setUserId, setUserName } from '@/lib/auth';
import { AuthSignInReq, AuthSignInRes, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import Loading from './loading';
import error from 'next/error';
import Image from 'next/image';

const authSignInUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_IN_URL || "/v1/auth/signin/";
const userIdUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "/v1/user/userid/";
const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "/v1/auth/verify/";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [username, setUsernameInForm] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const isAuthed = async () => {
      console.log("Checking authentication...");
      try {
        const resp = await authPost(authVerifyUrl, {});
        if (resp.status === 200) {
          console.log("User is authenticated, redirecting to profile...");
          router.push('/home');
          return;
        }
      } catch (error) {
        console.log("User is not authenticated, showing login form...");
      }
    };

    isAuthed();
  }, [router]);



  // Handle login form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const deviceId = getOrCreateDeviceId();
      const signInReq = new AuthSignInReq({ username }, password);

      const signInRes = await publicPost(authSignInUrl, signInReq, {
        headers: { 'Device-ID': deviceId },
      });

      if (signInRes.status === 200) {
        const authSignInResObj = plainToInstance(AuthSignInRes, signInRes.data);
        setAccessToken(authSignInResObj.access_token);
        setUserName(username);

        const userInternalReq = new UserInternalReq(username, true);
        const usernameRes = await authPost<UserInternalRes>(
          userIdUrl,
          userInternalReq
        );
        const userInternalResObj = plainToInstance(
          UserInternalRes,
          usernameRes.data
        );
        const resolvedUserId = userInternalResObj.toUserIds?.[username];
        if (!resolvedUserId) {
          setErrorMessage('Failed to resolve user id.');
          return;
        }
        setUserId(resolvedUserId);

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
<div className="relative min-h-screen w-full flex items-center justify-center px-6 py-10">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
  <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_55%)]" />

  <div className="relative z-10 card p-8 max-w-md w-full">
    <h2 className="text-3xl font-semibold text-center text-gray-900 dark:text-gray-100">Welcome Back</h2>
    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Sign in to your account</p>

    {error && <p className="text-red-500 text-sm text-center mb-4">{errorMessage}</p>}

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-medium">Username</label>
        <input
          type="username"
          value={username}
          onChange={(e) => setUsernameInForm(e.target.value)}
          className="w-full px-4 py-2.5 mt-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          placeholder="Enter your username"
          autoComplete="username"
          required
        />
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 mt-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </div>

      {/* Forgot Password */}
      <div className="text-right">
        <a href="#" className="text-blue-500 text-sm hover:underline dark:text-blue-400">Forgot password?</a>
      </div>

      {/* Login Button */}
      <button
        type="submit"
        className="w-full btn-primary py-2.5 text-sm font-semibold"
      >
        Sign In
      </button>
    </form>

    {/* Signup Link */}
    <p className="text-gray-600 dark:text-gray-400 text-sm text-center mt-4">
      Don't have an account? <a href="/register" className="text-blue-600 hover:underline dark:text-sky-300">Sign up</a>
    </p>
  </div>
</div>

  );
}
