"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, promoteUser, type UserRead } from "@/lib/api";
import { Button } from "@/components/Button";

type Props = {
  targetUsername: string;
  currentRole: string;
  onPromoted?: () => void;
};

export default function PromoteUserButton({ targetUsername, currentRole, onPromoted }: Props) {
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        const user = await getCurrentUser(token);
        if (!isMounted) return;
        setCurrentUser(user);
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

  const handlePromote = async () => {
    if (currentRole === "researcher") {
      setError("User is already a researcher.");
      return;
    }

    if (!confirm(`Are you sure you want to promote @${targetUsername} to researcher?`)) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;

    if (!token) {
      setError("Please sign in to perform this action.");
      return;
    }

    setIsPromoting(true);
    setError(null);
    setSuccess(false);

    try {
      await promoteUser(token, targetUsername, "researcher");
      setSuccess(true);
      if (onPromoted) {
        onPromoted();
      }
      // Refresh the page after a short delay to show the updated role
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (promoteError) {
      if (promoteError instanceof Error) {
        setError(promoteError.message);
      } else {
        setError("Failed to promote user. Please try again.");
      }
    } finally {
      setIsPromoting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // Only show if current user is moderator and target is not already researcher
  if (currentUser?.role !== "moderator" || currentRole === "researcher") {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">User promoted successfully!</p>
      )}
      <Button
        onClick={handlePromote}
        disabled={isPromoting}
        variant="primary"
        className="w-full"
      >
        {isPromoting ? "Promoting..." : "Promote to Researcher"}
      </Button>
    </div>
  );
}

