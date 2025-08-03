"use client";
import "reflect-metadata";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import useVerifyAccessToken from "@/hooks/use-verify-access-token";
import {
  getUserName,
  deleteAccessToken,
  deleteRefreshToken,
  axiosAuthClient,
} from "@/lib/auth";
import Loading from "./loading";
import Link from "next/link";
import Search from "./_ui/Search";

const authSignOutUrl =
  process.env.NEXT_PUBLIC_AUTH_SIGN_OUT_URL ||
  "http://localhost:80/v1/auth/signout/";
const deviceId = "some-unique-device-id";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userData, setUserData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await useVerifyAccessToken();
      if (!isAuthenticated) {
        router.push("/login");
      } else {
        setUserData(getUserName() || "");
        console.log("user data: " + getUserName());
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogOut = async () => {
    try {
      await axiosAuthClient.post(
        authSignOutUrl,
        {},
        { headers: { "Device-ID": deviceId } }
      );
      deleteRefreshToken();
      deleteAccessToken();
      setShowDropdown(false);
      router.push("/login");
      window.location.reload();
    } catch (error) {
      console.error("Auth failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileButtonClick = () => {
    setShowDropdown(false);
    router.push(`/profile/${getUserName()}`);
  };

  const handleHomeButtonClick = () => {
    setShowDropdown(false);
    router.push(`/home/`);
  };

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      {
        <header className="w-full bg-gray-900 text-white flex items-center justify-between px-6 py-4 shadow-lg shadow-gray-800/50 z-10 backdrop-blur-md bg-opacity-80">

          {/* Search Bar */}
          <Search />

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-4">
            {/* Home Button */}

            <button
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition shadow-md"
              onClick={handleHomeButtonClick}
            >
              Home
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                <span>{userData}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-48 bg-white text-gray-900 shadow-lg rounded-lg"
                >
                  <button
                    onClick={handleProfileButtonClick}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg"
                  >
                    Profile
                  </button>
                  <button
                    onClick={handleLogOut}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      }

      {/* Main Content */}
      <main ref={mainRef} className="flex-grow overflow-y-auto">{children}</main>
    </div>
  );
}
