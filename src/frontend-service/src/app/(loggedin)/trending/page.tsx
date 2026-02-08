"use client";
import useUserDetails from "@/hooks/use-user-details";
import PageContainer from "../_ui/PageContainer";
import StateMessage from "../_ui/StateMessage";
import TrendingPosts from "./_ui/TrendingPosts";
import { getUserName } from "@/lib/auth";

export default function TrendingPage() {





  return (
    <PageContainer>
      <TrendingPosts username={getUserName()!} />
    </PageContainer>
  );
}
