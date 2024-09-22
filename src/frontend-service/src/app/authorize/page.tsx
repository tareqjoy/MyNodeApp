'use client'
import 'reflect-metadata';
import { useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';

const AuthorizePage = () => {
  const [authorized, setAuthorized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useVerifyAccessToken(undefined, '/login');
  // Function to handle form submission
  const handleAuthorize = async () => {
    const redirect_uri  = searchParams.get('redirect_uri');
    try {
      // Generate a device-id (in a real-world app, you'd get this from somewhere)
      
      if (!localStorage.getItem('accessToken')) {
        router.push(`/login?${searchParams}`);
      }
      // Prepare the data to send in the body

    } catch (error) {
      // Handle errors (like invalid login)
      console.error('Auth failed:', error);
    }
  };

  const handleCancel = () => {
    setDismissed(true);
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
