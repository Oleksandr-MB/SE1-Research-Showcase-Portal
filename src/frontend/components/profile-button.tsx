"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { UserIcon } from "@/components/icons";

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
      className="shadow-soft-xs flex h-12 w-12 items-center justify-center rounded-full border border-[var(--DarkGray)] bg-[var(--White)] text-[var(--DarkGray)] hover:border-[var(--DarkGray)] hover:bg-[var(--DarkGray)] hover:text-[var(--White)] transition-all duration-200"
      aria-label="Go to your profile"
    >
      <UserIcon className="h-5 w-5" strokeWidth={1.8} />
    </button>
  );
}
