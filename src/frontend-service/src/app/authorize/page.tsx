'use client'
import 'reflect-metadata';
import { useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient } from '@/lib/auth';
import { AuthorizeClientReq, AuthorizeClientRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';

const AuthorizePage = () => {
  const [authorized, setAuthorized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const authorizeClientUrl: string = process.env.AUTH_CLIENT_URL || "http://127.0.0.1:5007/v1/auth/authorize/";

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const oldParam  = searchParams.toString();
  const callerQueryParam = oldParam ? `${oldParam}&callerPage=${encodeURIComponent(currentUrl)}` : `callerPage=${encodeURIComponent(currentUrl)}`;

  useVerifyAccessToken(undefined, `/login?${callerQueryParam}`);
  // Function to handle form submission
  const handleAuthorize = async () => {
    
    try {
      if (searchParams.get('client_id') && searchParams.get('redirect_uri')) {
        const authClientReq = new AuthorizeClientReq(searchParams.get('client_id')!);
        const resp = await axiosAuthClient.post(authorizeClientUrl, authClientReq);

        const authResObj = plainToInstance(AuthorizeClientRes, resp.data);

        if (resp.status == 200) {
          window.location.href = `${decodeURIComponent(searchParams.get('redirect_uri')!)}?code=${authResObj.code}`;
        }
      } else {
        router.push(`/profile`);
      }


    } catch (error) {
      // Handle errors (like invalid login)
      console.error('Auth failed:', error);
    }
  };

  const handleCancel = () => {
    router.push(`/profile`);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
      {!authorized ? (
        <>
          <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }} onClick={handleAuthorize}>Authorize</button>
          <button style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0070f3', color: 'white', border: 'none', cursor: 'pointer' }} onClick={handleCancel}>Cancel</button>
        </>
      ) : (
        <div>Authorized</div>
      )}
    </div>
  );
};

export default AuthorizePage;
