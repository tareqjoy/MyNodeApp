'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { axiosAuthClient, axiosPublicClient, setAccessToken, setRefreshToken, setUserId } from '@/lib/auth';
import { AuthSignInReq, AuthSignInRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import Loading from './loading';

const authSignInUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_IN_URL || "http://localhost:80/v1/auth/signin/";
const userIdUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://localhost:80/v1/user/userid/";
const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "http://localhost:80/v1/auth/verify/";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Check authentication on mount
  useEffect(() => {
    const isAuthed = async () => {
      console.log("Checking authentication...");
      try {
        const resp = await axiosAuthClient.post(authVerifyUrl, {});
        if (resp.status === 200) {
          console.log("User is authenticated, redirecting to profile...");
          router.push('/profile');
          return;
        }
      } catch (error) {
        console.error("User is not authenticated, showing login form...");
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
        setUsername(username);

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
          router.push('/profile');
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
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
              required
            />
          </label>
        </div>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  );
}
