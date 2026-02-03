"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api";
import { CheckInCircleIcon } from "@/components/icons";
import { Button } from "@/components/Button";

type Props = {
  postId: number;
  posterId: number;
};

export default function PostReviewAction({ postId, posterId }: Props) {
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
        // Only researchers who are NOT the post author can review
        const isResearcher =
          currentUser.role === "researcher" || currentUser.role === "moderator";
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
  }, [posterId]);

  if (isLoading) {
    return null; // Don't render while loading
  }

  if (!isAuthorized) {
    return null; // Don't render if user is not authorized
  }

  return (
    <Button
      type="button"
      onClick={() => window.open(`/posts/${postId}/review`, "_blank")}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <CheckInCircleIcon className="inline-block text-current" />
      Review
    </Button>
  );
}
