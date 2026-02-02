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
    <div className={`max-w-4xl mx-auto p-6 space-y-6 ${className}`.trim()}>
      {children}
    </div>
  );
}
