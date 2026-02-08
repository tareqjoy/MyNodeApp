"use client";

import "reflect-metadata";
import { useEffect, useState } from "react";
import { UserDetailsRes } from "@tareqjoy/models";
import { authGet, getUserId } from "@/lib/auth";
import { plainToInstance } from "class-transformer";

const userDetailsUrl: string =
  process.env.NEXT_PUBLIC_USER_DETAILS_URL || "/v1/user/detail";

type UseUserDetailsResult = {
  user: UserDetailsRes | null;
  loading: boolean;
  error: string | null;
};

export default function useUserDetails(
  userId?: string | null
): UseUserDetailsResult {
  const [user, setUser] = useState<UserDetailsRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolvedUserId = userId ?? getUserId();
    if (!resolvedUserId) {
      setError("Missing user id.");
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const axiosResp = await authGet(
          `${userDetailsUrl}/${resolvedUserId}`,
          {
            params: { provided: "userid" },
          }
        );
        const userDetailsResObj = plainToInstance(
          UserDetailsRes,
          axiosResp.data
        );
        console.info("Fetched user details:", userDetailsResObj);
        setUser(userDetailsResObj);
      } catch (err) {
        setError("Failed to load user data.");
        console.error("Error fetching user details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
}
