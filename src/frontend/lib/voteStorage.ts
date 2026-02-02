"use client";

const base64UrlDecode = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
};

const fnv1aHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const getVoteStorageUserKey = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("rsp_token");
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length >= 2) {
    try {
      const payloadJson = base64UrlDecode(parts[1]);
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const sub = payload.sub ?? payload.username ?? payload.user;
      if (typeof sub === "string" && sub.trim()) {
        return sub;
      }
      if (typeof sub === "number" && Number.isFinite(sub)) {
        return String(sub);
      }
    } catch {
      // ignore
    }
  }

  return `token:${fnv1aHash(token)}`;
};

