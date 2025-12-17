"use client";

import { useRouter } from "next/navigation";
import { usePolling } from "@/lib/usePolling";

type Props = {
  intervalMs?: number;
  enabled?: boolean;
};

export default function RouteRefreshPoller({
  intervalMs = 2000,
  enabled = true,
}: Props) {
  const router = useRouter();

  usePolling(
    async () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        const tag = active.tagName.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          active.isContentEditable
        ) {
          return;
        }
      }
      router.refresh();
    },
    [router],
    { enabled, intervalMs, immediate: false },
  );

  return null;
}
