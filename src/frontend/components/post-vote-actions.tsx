"use client";

import { useEffect, useState } from "react";
import { getPostById, voteOnPost } from "@/lib/api";
import { DownvoteIcon, UpvoteIcon } from "@/components/icons";
import { usePolling } from "@/lib/usePolling";
import { getVoteStorageUserKey } from "@/lib/voteStorage";

type Props = {
  postId: number;
  initialUpvotes: number;
  initialDownvotes: number;
};

const postVoteStorageKey = (postId: number) => {
  const userKey = getVoteStorageUserKey();
  return userKey ? `rsp_vote:post:${postId}:${userKey}` : null;
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

  useEffect(() => {
    const token = window.localStorage.getItem("rsp_token");
    if (!token) {
      return;
    }

    const key = postVoteStorageKey(postId);
    if (!key) {
      return;
    }

    const raw = window.localStorage.getItem(key);
    const parsed = Number(raw);
    if (parsed === 1 || parsed === -1 || parsed === 0) {
      setCurrentVote(parsed as 0 | 1 | -1);
    }
  }, [postId]);

  usePolling(
    async ({ isActive }) => {
      if (isVoting) {
        return;
      }
      try {
        const post = await getPostById(postId);
        if (!isActive()) return;
        setCounts({
          upvotes: post.upvotes ?? 0,
          downvotes: post.downvotes ?? 0,
        });
      } catch {
        // ignore background refresh failures
      }
    },
    [postId, isVoting],
    { intervalMs: 2000, immediate: false },
  );

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
      const key = postVoteStorageKey(postId);
      if (key) {
        window.localStorage.setItem(key, String(nextValue));
      }
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

  const buttonClasses = (active: boolean, variant: "up" | "down" = "up") =>
    `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? variant === "up"
          ? "bg-[var(--Green)] text-[var(--White)]"
          : "bg-[var(--Red)] text-[var(--White)]"
        : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
    } ${variant === "up" ? "UpvoteButton" : "DownvoteButton"}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={isVoting}
          className={buttonClasses(currentVote === 1, "up")}
        >
          <UpvoteIcon />
          <span className="tabular-nums">{counts.upvotes}</span>
        </button>
        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={isVoting}
          className={buttonClasses(currentVote === -1, "down")}
        >
          <DownvoteIcon />
          <span className="tabular-nums">{counts.downvotes}</span>
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
