"use client";
import { getUserName } from "@/lib/auth";
import useUserDetails from "@/hooks/use-user-details";
import ProfilePost from "./_ui/ProfilePost";
import TimelinePosts from "./_ui/TimelinePosts";
import PageContainer from "../_ui/PageContainer";
import StateMessage from "../_ui/StateMessage";

export default function HomePage() {
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
      {/* Profile Info */}

      <div className=" rounded-lg shadow">
        <ProfilePost />
      </div>

      <TimelinePosts username={getUserName()!} />
    </PageContainer>
  );
}
