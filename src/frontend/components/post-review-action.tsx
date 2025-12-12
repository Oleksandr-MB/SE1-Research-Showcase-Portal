"use client";

import { useState, useEffect } from "react";
import type { UserRead } from "@/lib/api";
import { getCurrentUser } from "@/lib/api";

type Props = {
  postId: number;
};

export default function PostReviewAction({ postId }: Props) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("rsp_token")
          : null;

      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (!isMounted) return;

        
        setUser(currentUser);
        // Check if user is researcher (only researchers can review)
        const isResearcher = currentUser.role === "researcher";
        setIsAuthorized(isResearcher);
      } catch (error) {
        console.error("Unable to fetch user:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return null; // Don't render while loading
  }

  if (!isAuthorized) {
    return null; // Don't render if user is not authorized
  }

  return (
    <button
      type="button"
      onClick={() => window.open(`/posts/${postId}/review`, '_blank')}
      className="rounded-full px-4 py-2 text-sm font-semibold transition border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
    >
      <svg className="h-4 w-4 inline-block text-current mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7 12a5 5 0 1110 0A5 5 0 017 12z"
        />
      </svg>
      Review
    </button>
  );
}
