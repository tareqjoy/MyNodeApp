'use client'

import 'reflect-metadata';
import { getUserId, getUserName } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePageRedirect() {

const router = useRouter();

useEffect(() => {
    router.push(`/profile/${getUserName()!}`); // Navigate to the default profile
  }, [ router]);
  return;
}