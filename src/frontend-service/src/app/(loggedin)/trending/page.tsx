"use client";
import useUserDetails from "@/hooks/use-user-details";
import PageContainer from "../_ui/PageContainer";
import StateMessage from "../_ui/StateMessage";
import TrendingPosts from "./_ui/TrendingPosts";
import { getUserName } from "@/lib/auth";

export default function TrendingPage() {

  return (
    <PageContainer>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Trending</h1>
        <p className="text-gray-500 dark:text-gray-400">See what is getting the most attention right now.</p>
      </div>
      <TrendingPosts username={getUserName()!} />
    </PageContainer>
  );
}
