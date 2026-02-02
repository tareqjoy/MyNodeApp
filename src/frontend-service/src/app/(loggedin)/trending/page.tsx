"use client";
import useUserDetails from "@/hooks/use-user-details";
import PageContainer from "../_ui/PageContainer";
import StateMessage from "../_ui/StateMessage";

export default function TrendingPage() {
  const { user, loading, error } = useUserDetails();

  if (loading) {
    return <StateMessage variant="loading" message="Loading..." />;
  }

  if (error) {
    return <StateMessage variant="error" message={error} />;
  }

  if (!user) {
    return <StateMessage variant="empty" message="No user data available." />;
  }

  return (
    <PageContainer>
      {/* Trending content goes here */}
    </PageContainer>
  );
}
