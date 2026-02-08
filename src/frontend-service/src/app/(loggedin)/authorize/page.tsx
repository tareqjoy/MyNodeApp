'use client'
import 'reflect-metadata';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { authPost } from '@/lib/auth';
import { AuthorizeClientReq, AuthorizeClientRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';

export default function AuthorizePage() {
  const [authorized, setAuthorized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const authorizeClientUrl: string = process.env.NEXT_PUBLIC_AUTH_AUTHORIZE_URL || "/v1/auth/authorize/";


  useEffect(() => {
    const isAuthed = async () => {
      if(!await useVerifyAccessToken()) {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        const oldParam  = searchParams.toString();      
        const callerQueryParam = oldParam ? `${oldParam}&callerPage=${encodeURIComponent(currentUrl)}` : `callerPage=${encodeURIComponent(currentUrl)}`;
        router.push(`/login?${callerQueryParam}`)
      } 
    };
    isAuthed();
  });
  // Function to handle form submission
  const handleAuthorize = async () => {
    
    try {
      if (searchParams.get('client_id') && searchParams.get('redirect_uri')) {
        const authClientReq = new AuthorizeClientReq(searchParams.get('client_id')!, searchParams.get('redirect_uri')!, "code");
        const resp = await authPost(authorizeClientUrl, authClientReq);

        const authResObj = plainToInstance(AuthorizeClientRes, resp.data);

        if (resp.status == 200) {
          window.location.href = `${decodeURIComponent(searchParams.get('redirect_uri')!)}?code=${authResObj.code}`;
        }
      } else {
        router.push(`/home`);
      }


    } catch (error) {
      // Handle errors (like invalid login)
      console.error('Auth failed:', error);
    }
  };

  const handleCancel = () => {
    router.push(`/home`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="card p-8 w-full max-w-md space-y-4">
        {!authorized ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">Authorize App</h1>
            <p className="text-gray-500 dark:text-gray-400 text-center">Continue to grant access to your account.</p>
            <button className="w-full btn-primary py-2.5 text-sm font-semibold" onClick={handleAuthorize}>Authorize</button>
            <button className="w-full btn-secondary py-2.5 text-sm font-semibold" onClick={handleCancel}>Cancel</button>
          </>
        ) : (
          <div className="text-center text-gray-600 dark:text-gray-300">Authorized</div>
        )}
      </div>
    </div>
  );
};
