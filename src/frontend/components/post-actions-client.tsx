"use client";

import { useEffect, useState } from "react";
import DeletePostButton from "@/components/delete-post-button";
import { getCurrentUser, type UserRead } from "@/lib/api";

type Props = {
  postId: number;
  posterId: number;
};

/**
 * PostActionsClient Component
 * 
 * Client-side component that handles post actions like deletion.
 * Checks if the current user is the owner of the post and renders the delete button accordingly.
 * 
 * @param postId - The ID of the post
 * @param posterId - The ID of the user who created the post
 */
export default function PostActionsClient({ postId, posterId }: Props) {
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching current user:", error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (isLoading) {
    return null;
  }

  const isOwner = currentUser?.id === posterId;

  return (
    <DeletePostButton 
      postId={postId} 
      isOwner={isOwner} 
    />
  );
}
