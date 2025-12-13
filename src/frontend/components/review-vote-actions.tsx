"use client";

import { useEffect, useState } from "react";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("rsp_token");
    setIsLoggedIn(!!token);
  }, []);

  const handleVote = async (value: 1 | -1) => {
    if (!isLoggedIn) {
      alert("Please log in to vote on reviews");
      return;
    }

    const token = localStorage.getItem("rsp_token");
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      if (!response.ok) {
        throw new Error("Failed to vote");
      }

      const updatedReview = await response.json();
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
      alert("Failed to vote on review");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote(1)}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 rounded px-3 py-1.5 font-medium transition-colors ${
          userVote === 1
            ? "bg-green-600 text-white"
            : isLoggedIn
              ? "bg-gray-100 text-gray-700 hover:bg-green-100"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
        <span>{upvotes}</span>
      </button>
      <button
        onClick={() => handleVote(-1)}
        disabled={!isLoggedIn}
        className={`flex items-center gap-1 rounded px-3 py-1.5 font-medium transition-colors ${
          userVote === -1
            ? "bg-red-600 text-white"
            : isLoggedIn
              ? "bg-gray-100 text-gray-700 hover:bg-red-100"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
        <span>{downvotes}</span>
      </button>
    </div>
  );
}
