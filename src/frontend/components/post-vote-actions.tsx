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
        ? "bg-[var(--primary_accent)] text-[var(--inverse_text)]"
        : "border border-[var(--border_on_surface_soft)] text-[var(--muted_text)] hover:border-[var(--primary_accent)] hover:text-[var(--primary_accent)]"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={buttonClasses(currentVote === 1)}
      >
        👍 {counts.upvotes}
      </button>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={buttonClasses(currentVote === -1)}
      >
        👎 {counts.downvotes}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
