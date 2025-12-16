"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewsButtonProps {
  postId: number;
}

export default function ReviewsButton({ postId }: ReviewsButtonProps) {
  const router = useRouter();
  const [isLoggedIn] = useState(
    () =>
      typeof window !== "undefined" && Boolean(localStorage.getItem("rsp_token")),
  );
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (!isLoggedIn) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }
    router.push(`/posts/${postId}/reviews`);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={!isLoggedIn}
        className={`inline-flex items-center justify-center font-medium transition-all duration-300 ease-apple rounded-full px-5 py-2.5 text-sm ${
          isLoggedIn
            ? "bg-[var(--DarkGray)] text-[var(--White)] border border-transparent hover:bg-[var(--Black)] focus:outline-none focus:ring-2 focus:ring-offset-2"
            : "opacity-60 cursor-not-allowed bg-[#F7F7F7] text-[var(--Gray)] border border-[#E5E5E5]"
        }`}
      >
        Reviews
      </button>
      {showTooltip && !isLoggedIn && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--DarkGray)] text-white text-sm rounded-lg whitespace-nowrap shadow-soft-md">
          Please Log In
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[var(--DarkGray)]"></div>
        </div>
      )}
    </div>
  );
}
