"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewsButtonProps {
  postId: number;
}

export default function ReviewsButton({ postId }: ReviewsButtonProps) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    router.push(`/posts/${postId}/reviews`);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center font-medium transition-all duration-300 ease-apple rounded-full px-5 py-2.5 text-sm bg-[var(--DarkGray)] text-[var(--White)] hover:bg-[var(--Black)] focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        Reviews
      </button>
    </div>
  );
}
