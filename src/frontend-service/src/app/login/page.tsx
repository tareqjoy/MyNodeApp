'use client'
import 'reflect-metadata';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { axiosPublicClient, setAccessToken, setRefreshToken } from '@/lib/auth';
import { AuthSignInReq, AuthSignInRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';

const authSignInUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_IN_URL || "http://127.0.0.1:5007/v1/auth/signin/";

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useVerifyAccessToken('/profile');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    try {
      const deviceId = 'some-unique-device-id';

      const signInReq = new AuthSignInReq({username: username}, password);

      const signInRes = await axiosPublicClient.post(authSignInUrl, signInReq, {
        headers: {
          'Device-ID': deviceId,
        },
      });

      if (signInRes.status == 200) {
        const authSignInResObj = plainToInstance(AuthSignInRes, signInRes.data);

        setAccessToken(authSignInResObj.access_token);
        setRefreshToken(authSignInResObj.refresh_token);

        const callerPage  = searchParams.get('callerPage');
        console.log(`redirect uri: ${callerPage}`)
        if(callerPage) {
          const urlParams = new URLSearchParams(searchParams);
          urlParams.delete('callerPage');

          const remainingParams = urlParams.toString();

          const redirectUrl = `${callerPage}${remainingParams ? '?' + remainingParams: ''}`;

          router.push(redirectUrl);
        } else {
          router.push('/profile');
        }

      } else {
        setErrorMessage('Login failed. Please check your credentials.');
      }
    } catch (error) {
      // Handle errors (like invalid login)
      console.error('Login failed:', error);
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
};

export default LoginPage;
