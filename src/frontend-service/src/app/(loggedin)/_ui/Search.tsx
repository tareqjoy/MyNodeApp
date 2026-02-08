"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import debounce from "debounce"; // For debouncing API calls
import { SearchReq, SearchRes } from "@tareqjoy/models";
import { authPost } from "@/lib/auth";
import { plainToInstance } from "class-transformer";
import HighlightText from "./HighlightText";

const searchUrl: string =
  process.env.NEXT_PUBLIC_USER_DETAILS_URL ||
  "/v1/search/all";

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRes | null>(null);
  const [showResults, setShowResults] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  const removeMarkTags = (text: string): string => {
    return text.replace(/<\/?mark>/g, "");  // Removes both <mark> and </mark> tags
  };

  const resetSearchUI = (): void => {
    setShowResults(false);
    setQuery("");
    setResults(null);
  };

  // Fetch search results (Debounced)
  const fetchSearchResults = debounce(async (searchTerm: string) => {
    if (!searchTerm) {
      setResults(null);
      return;
    }

    try {
      const searchReq = new SearchReq({ allToken: searchTerm });
      const searchAxiosResp = await authPost(searchUrl, searchReq);
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
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={handleChange}
        className="w-full px-4 py-2.5 rounded-full bg-white/80 text-gray-900 border border-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition placeholder:text-gray-400 dark:bg-white/10 dark:text-white dark:border-white/10 dark:placeholder:text-white/60"
        onClick={() => setShowResults(true)} // Prevent immediate close on click
      />

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute min-w-full card text-gray-900 dark:text-gray-100 shadow-2xl rounded-2xl mt-3 z-50 p-2 border border-white/70 dark:border-white/10 rise-in">
          {/* User Results */}
          {results?.userResults && results?.userResults?.length > 0 && (
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 font-semibold px-2 text-xs uppercase tracking-wider">Users</h3>
              {results?.userResults?.map((user) => (
                <Link
                  href={`/profile/${removeMarkTags(user.username)}`}
                  key={user.userid}
                  className="block px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                  onClick={() => resetSearchUI() }
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
                className="block py-2 text-blue-600 hover:text-blue-700 dark:text-sky-300 dark:hover:text-white transition"
                onClick={() => resetSearchUI() }
              >
                See More Users
              </Link>
            </div>
          )}

          {/* Post Results */}
          {results?.postResults && results.postResults.length > 0 && (
            <div className="mt-2">
              <h3 className="text-gray-500 dark:text-gray-400 font-semibold px-2 text-xs uppercase tracking-wider">Posts</h3>
              {results?.postResults?.map((post) => (
                <Link
                  href={`/post/${post.postid}`}
                  key={post.postid}
                  className="block px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                  onClick={() => resetSearchUI() }
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
                className="block py-2 text-blue-600 hover:text-blue-700 dark:text-sky-300 dark:hover:text-white transition"
                onClick={() => resetSearchUI() }
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
