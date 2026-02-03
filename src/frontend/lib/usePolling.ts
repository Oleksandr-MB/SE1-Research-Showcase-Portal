"use client";

import { useEffect, useRef } from "react";

export type PollContext = {
  isActive: () => boolean;
};

export type UsePollingOptions = {
  enabled?: boolean;
  intervalMs: number;
  immediate?: boolean;
};

export function usePolling(
  fn: (ctx: PollContext) => void | Promise<void>,
  deps: readonly unknown[],
  { enabled = true, intervalMs, immediate = true }: UsePollingOptions,
) {
  const fnRef = useRef(fn);
  const activeRef = useRef(true);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      return;
    }

    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      inFlight = true;
      try {
        await fnRef.current({ isActive: () => activeRef.current });
      } finally {
        inFlight = false;
      }
    };

    if (immediate) {
      void tick();
    }

    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is intentionally spread as a dependency list.
  }, [enabled, intervalMs, immediate, ...deps]);
}
