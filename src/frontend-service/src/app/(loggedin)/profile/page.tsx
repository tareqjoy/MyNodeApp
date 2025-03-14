'use client'

import 'reflect-metadata';
import { getUserId } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePageRedirect() {

const router = useRouter();

useEffect(() => {
    router.push(`/profile/${getUserId()!}`); // Navigate to the default profile
  }, [ router]);
  return;
}