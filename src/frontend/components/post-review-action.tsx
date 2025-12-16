"use client";

import { useState, useEffect } from "react";
import type { UserRead } from "@/lib/api";
import { getCurrentUser } from "@/lib/api";
import { CheckInCircleIcon } from "@/components/icons";

type Props = {
  postId: number;
  posterId: number;
};

export default function PostReviewAction({ postId, posterId }: Props) {
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
        // Only researchers who are NOT the post author can review
        const isResearcher = currentUser.role === "researcher";
        const isNotAuthor = currentUser.id !== posterId;
        setIsAuthorized(isResearcher && isNotAuthor);
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
      <CheckInCircleIcon className="mr-1.5 inline-block text-current" />
      Review
    </button>
  );
}
