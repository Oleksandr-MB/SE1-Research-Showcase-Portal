"use client";

import { useState } from "react";
import { voteOnPost } from "@/lib/api";

type Props = {
  postId: number;
  initialUpvotes: number;
  initialDownvotes: number;
};

export default function PostVoteActions({
  postId,
  initialUpvotes,
  initialDownvotes,
}: Props) {
  const [counts, setCounts] = useState({
    upvotes: initialUpvotes,
    downvotes: initialDownvotes,
  });
  const [currentVote, setCurrentVote] = useState<0 | 1 | -1>(0);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (value: 1 | -1) => {
    setError(null);
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;
    if (!token) {
      setError("You need to be signed in to vote.");
      return;
    }

    const nextValue = currentVote === value ? 0 : value;
    setIsVoting(true);
    try {
      const response = await voteOnPost(token, postId, nextValue);
      setCounts(response);
      setCurrentVote(nextValue);
    } catch (voteError) {
      if (voteError instanceof Error) {
        setError(voteError.message);
      } else {
        setError("Unable to record your vote right now.");
      }
    } finally {
      setIsVoting(false);
    }
  };

  const buttonClasses = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-[var(--Red)] text-[var(--White)]"
        : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={buttonClasses(currentVote === 1)}
      >
      <svg className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"/>
      </svg> {counts.upvotes}
      </button>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={buttonClasses(currentVote === -1)}
      >
      <svg className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"/>
      </svg> {counts.downvotes}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
