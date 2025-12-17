"use client";

import { useEffect, useState } from "react";
import { voteOnReview } from "@/lib/api";
import { DownvoteIcon, UpvoteIcon } from "@/components/icons";

interface ReviewVoteActionsProps {
  reviewId: number;
  initialUpvotes: number;
  initialDownvotes: number;
}

const getVoteStorageUserKey = () => {
  const token = window.localStorage.getItem("rsp_token");
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length >= 2) {
    try {
      const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const sub = payload.sub ?? payload.username ?? payload.user;
      if (typeof sub === "string" && sub.trim()) {
        return sub;
      }
      if (typeof sub === "number") {
        return String(sub);
      }
    } catch {
      // ignore
    }
  }

  return token.slice(0, 12);
};

const reviewVoteStorageKey = (reviewId: number) => {
  const userKey = getVoteStorageUserKey();
  return userKey ? `rsp_vote:review:${reviewId}:${userKey}` : null;
};

export default function ReviewVoteActions({
  reviewId,
  initialUpvotes,
  initialDownvotes,
}: ReviewVoteActionsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("rsp_token");
    if (!token) {
      return;
    }

    const key = reviewVoteStorageKey(reviewId);
    if (!key) {
      return;
    }

    const raw = window.localStorage.getItem(key);
    const parsed = Number(raw);
    if (parsed === 1 || parsed === -1) {
      setUserVote(parsed as 1 | -1);
    }
  }, [reviewId]);

  const handleVote = async (value: 1 | -1) => {
    setError(null);
    const token = localStorage.getItem("rsp_token");
    if (!token) {
      setError("You need to be signed in to vote.");
      return;
    }

    try {
      setIsVoting(true);
      const nextVote = userVote === value ? null : value;
      const updatedReview = await voteOnReview(token, reviewId, value);
      setUpvotes(updatedReview.upvotes);
      setDownvotes(updatedReview.downvotes);

      setUserVote(nextVote);
      const key = reviewVoteStorageKey(reviewId);
      if (key) {
        window.localStorage.setItem(key, String(nextVote ?? 0));
      }
    } catch (error) {
      console.error("Error voting:", error);
      setError(error instanceof Error ? error.message : "Failed to vote on review.");
    } finally {
      setIsVoting(false);
    }
  };

  const buttonClasses = (active: boolean, variant: "up" | "down") =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? variant === "up"
          ? "bg-[var(--Green)] text-[var(--White)]"
          : "bg-[var(--Red)] text-[var(--White)]"
        : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
    } ${variant === "up" ? "UpvoteButton" : "DownvoteButton"}`;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={buttonClasses(userVote === 1, "up")}
      >
        <UpvoteIcon />
        {upvotes}
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={buttonClasses(userVote === -1, "down")}
      >
        <DownvoteIcon />
        {downvotes}
      </button>
      </div>
      {error && <span className="text-xs text-[var(--Red)]">{error}</span>}
    </div>
  );
}
