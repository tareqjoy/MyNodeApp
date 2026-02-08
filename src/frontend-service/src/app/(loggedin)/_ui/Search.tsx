"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import debounce from "debounce"; // For debouncing API calls
import { SearchReq, SearchRes } from "@tareqjoy/models";
import { authPost } from "@/lib/auth";
import { plainToInstance } from "class-transformer";
import HighlightText from "./HighlightText";

const searchUrl: string =
  process.env.NEXT_PUBLIC_USER_DETAILS_URL ||
  "/v1/search/all";

const Search = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchRes | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  const removeMarkTags = (text: string): string => {
    return text.replace(/<\/?mark>/g, "");  // Removes both <mark> and </mark> tags
  };

  const resetSearchUI = (): void => {
    setShowResults(false);
    setQuery("");
    setResults(null);
    setHasSearched(false);
  };

  // Fetch search results (Debounced)
  const fetchSearchResults = useMemo(
    () =>
      debounce(async (searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed || trimmed.length < 2) {
          setResults(null);
          setHasSearched(false);
          return;
        }

        setLoading(true);
        try {
          const searchReq = new SearchReq({ allToken: trimmed });
          const searchAxiosResp = await authPost(searchUrl, searchReq);
          const searchResObj = plainToInstance(SearchRes, searchAxiosResp.data);
          setResults(searchResObj);
          setHasSearched(true);
          setShowResults(true);
        } catch (error) {
          console.error("Error fetching search results", error);
        } finally {
          setLoading(false);
        }
      }, 300),
    [],
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = e.target.value;
    setQuery(nextQuery);
    setShowResults(true);
    fetchSearchResults(nextQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowResults(false);
      return;
    }
    if (e.key === "Enter") {
      const trimmed = query.trim();
      if (trimmed.length > 0) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        setShowResults(false);
      }
    }
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

  useEffect(() => {
    return () => {
      (fetchSearchResults as unknown as { clear?: () => void }).clear?.();
    };
  }, [fetchSearchResults]);

  const trimmedQuery = query.trim();
  const hasUsers = (results?.userResults?.length || 0) > 0;
  const hasPosts = (results?.postResults?.length || 0) > 0;
  const hasResults = hasUsers || hasPosts;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/60">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search people or posts"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white/80 text-gray-900 border border-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition placeholder:text-gray-400 dark:bg-white/10 dark:text-white dark:border-white/10 dark:placeholder:text-white/60"
          aria-expanded={showResults}
          aria-haspopup="listbox"
        />
        {query && (
          <button
            type="button"
            onClick={resetSearchUI}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-700 dark:text-white/60 dark:hover:text-white"
            aria-label="Clear search"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute min-w-full card text-gray-900 dark:text-gray-100 shadow-2xl rounded-2xl mt-3 z-50 p-2 border border-white/70 dark:border-white/10 rise-in">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {!loading && trimmedQuery.length > 0 && trimmedQuery.length < 2 && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search.
            </div>
          )}

          {!loading && hasSearched && !hasResults && (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No results for "{trimmedQuery}".
            </div>
          )}

          {/* User Results */}
          {hasUsers && (
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
          {hasUsers && (
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
          {hasPosts && (
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
          {hasPosts && (
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
