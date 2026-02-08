"use client";

import { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className={`max-w-5xl mx-auto px-6 py-8 space-y-6 fade-in ${className}`.trim()}>
      {children}
    </div>
  );
}
