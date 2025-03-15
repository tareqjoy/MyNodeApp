"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import debounce from "debounce"; // For debouncing API calls
import { SearchReq, SearchRes } from "@tareqjoy/models";
import { axiosAuthClient } from "@/lib/auth";
import { plainToInstance } from "class-transformer";
import HighlightText from "./HighlightText";

const searchUrl: string =
  process.env.NEXT_PUBLIC_USER_DETAILS_URL ||
  "http://localhost:80/v1/search/all";

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRes | null>(null);
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch search results (Debounced)
  const fetchSearchResults = debounce(async (searchTerm: string) => {
    if (!searchTerm) {
      setResults(null);
      return;
    }

    try {
      const searchReq = new SearchReq({ allToken: searchTerm });
      const searchAxiosResp = await axiosAuthClient.post(searchUrl, searchReq);
      const searchResObj = plainToInstance(SearchRes, searchAxiosResp.data);
      setResults(searchResObj);
      setShowResults(true);
    } catch (error) {
      console.error("Error fetching search results", error);
    }
  }, 300); // Debounce for 300ms

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    fetchSearchResults(e.target.value);
  };

  // Handles outside clicks to hide the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-1/3">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={handleChange}
        className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setShowResults(true)} // Prevent immediate close on click
      />

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute min-w-full bg-gray-800 text-white shadow-lg rounded-lg mt-2 z-50 p-2 border border-gray-600">
          {/* User Results */}
          {results?.userResults && results?.userResults?.length > 0 && (
            <div>
              <h3 className="text-gray-300 font-semibold px-2">Users</h3>
              {results?.userResults?.map((user) => (
                <Link
                  href={`/profile/${user.username}`}
                  key={user.userid}
                  className="block px-4 py-2 hover:bg-gray-700 rounded-md"
                >
                  <HighlightText text={user.name} /> 
                  <span> (@<HighlightText text={user.username} />)</span>
                </Link>
              ))}
            </div>
          )}

          {/* "See More" Button */}
          {(results?.userResults && results.userResults.length > 0) && (
            <div className="mt-2 text-center">
              <Link
                href={`/search?q=${query}`}
                className="block py-2 text-blue-400 hover:underline"
              >
                See More Users
              </Link>
            </div>
          )}

          {/* Post Results */}
          {results?.postResults && results.postResults.length > 0 && (
            <div className="mt-2">
              <h3 className="text-gray-300 font-semibold px-2">Posts</h3>
              {results?.postResults?.map((post) => (
                <Link
                  href={`/post/${post.postid}`}
                  key={post.postid}
                  className="block px-4 py-2 hover:bg-gray-700 rounded-md"
                >
                  <HighlightText text={post.body} />
                </Link>
              ))}
            </div>
          )}

          {/* "See More" Button */}
          {(
            (results?.postResults && results.postResults.length > 0)) && (
            <div className="mt-2 text-center">
              <Link
                href={`/search?q=${query}`}
                className="block py-2 text-blue-400 hover:underline"
              >
                See More Posts
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
