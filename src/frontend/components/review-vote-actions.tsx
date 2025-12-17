"use client";

import { useState } from "react";
import { voteOnReview } from "@/lib/api";

interface ReviewVoteActionsProps {
  reviewId: number;
  initialUpvotes: number;
  initialDownvotes: number;
}

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

  const handleVote = async (value: 1 | -1) => {
    setError(null);
    const token = localStorage.getItem("rsp_token");
    if (!token) {
      setError("You need to be signed in to vote.");
      return;
    }

    try {
      setIsVoting(true);
      const updatedReview = await voteOnReview(token, reviewId, value);
      setUpvotes(updatedReview.upvotes);
      setDownvotes(updatedReview.downvotes);

      // Toggle vote if same, otherwise set new vote
      if (userVote === value) {
        setUserVote(null);
      } else {
        setUserVote(value);
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
        <svg className="h-4 w-4 inline-block text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        {upvotes}
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={buttonClasses(userVote === -1, "down")}
      >
        <svg className="h-4 w-4 inline-block text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        {downvotes}
      </button>
      </div>
      {error && <span className="text-xs text-[var(--Red)]">{error}</span>}
    </div>
  );
}
