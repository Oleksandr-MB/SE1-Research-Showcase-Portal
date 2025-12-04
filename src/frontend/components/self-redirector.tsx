"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
type Props = {
  targetUsername: string;
};

const decodeUsernameFromToken = (token: string): string | null => {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch {
    return null;
  }
};

export default function SelfRedirector({ targetUsername }: Props) {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;
    if (!token) {
      return;
    }
    const usernameFromToken = decodeUsernameFromToken(token);
    if (usernameFromToken && usernameFromToken === targetUsername) {
      router.replace("/me");
    }
  }, [router, targetUsername]);

  return null;
}
