'use client';

import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div
    className="relative h-screen w-full bg-cover bg-center flex items-center justify-center"
    style={{ backgroundImage: "url('/login-bg.jpg')" }}
  >      <div className="absolute inset-0 bg-black opacity-50" />
      {children}
    </div>
  );
}
