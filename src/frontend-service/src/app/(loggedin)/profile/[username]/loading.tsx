import { Suspense } from "react";

export default function Loading() {
  return (
    <div className="flex h-screen justify-center items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
    </div>
  );
}
