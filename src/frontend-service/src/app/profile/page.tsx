'use client'
import 'reflect-metadata';
import { Suspense, useEffect, useState } from 'react';
import useVerifyAccessToken from '@/hooks/use-verify-access-token';
import { axiosAuthClient, deleteAccessToken, deleteRefreshToken } from '@/lib/auth';
import { useRouter } from "next/navigation";
import Loading from './loading';


const userTimelineUrl: string = process.env.NEXT_PUBLIC_USER_DETAILS_URL || "http://127.0.0.1:80/v1/timeline/home/";


export default function ProfilePage() {

  useEffect(() => {
    const isAuthed = async () => {
      
    };
    isAuthed();
  }, []);

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem' }}>
    <p>Timeline</p>
    </div>
  );
};
