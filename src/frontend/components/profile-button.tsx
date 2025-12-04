"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function ProfileButton() {
  const router = useRouter();

  const handleClick = useCallback(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;
    router.push(token ? "/me" : "/login");
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="shadow-soft-xs flex h-12 w-12 items-center justify-center rounded-full border border-[var(--primary_accent)] bg-[var(--surface_primary)] text-[var(--primary_accent)] transition-colors hover:border-[var(--titles)] hover:bg-[var(--DarkRed)] hover:text-white"
      aria-label="Go to your profile"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 20a8 8 0 0 1 16 0"
        />
      </svg>
    </button>
  );
}
