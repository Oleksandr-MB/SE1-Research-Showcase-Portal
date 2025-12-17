"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CommentActivity, PostSummary, UserRead } from "@/lib/api";
import {
  getCurrentUser,
  getMyRecentComments,
  getPublishedPostsByUsername,
} from "@/lib/api";
import { Button } from "@/components/Button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { DownvoteIcon, LogoutIcon, UpvoteIcon } from "@/components/icons";
import { usePolling } from "@/lib/usePolling";

function formatJoinedDate(createdAt: string | undefined) {
  if (!createdAt) return "Unknown member since";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown member since";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

const truncate = (value: string | undefined, limit = 128) => {
  const text = (value ?? "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1))}…`;
};

type ActivityTab = "posts" | "comments";

function selectRecentPosts(posts: PostSummary[], limit = 5) {
  return [...posts]
    .filter((p) => p.phase === "published")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);
}

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Could not validate credentials") ||
    message.includes("Token has been revoked") ||
    message.includes("Not authenticated") ||
    message.includes("API request failed (401")
  );
}

export default function MePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [recentPosts, setRecentPosts] = useState<PostSummary[]>([]);
  const [recentComments, setRecentComments] = useState<CommentActivity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const requestedTab = useMemo<ActivityTab>(() => {
    const raw = searchParams.get("activity")?.toLowerCase();
    return raw === "comments" ? "comments" : "posts";
  }, [searchParams]);

  const [activityTab, setActivityTab] = useState<ActivityTab>(requestedTab);

  useEffect(() => {
    setActivityTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async (token: string, username: string) => {
      try {
        if (!isMounted) return;
        setIsLoadingActivity(true);

        const [posts, comments] = await Promise.all([
          getPublishedPostsByUsername(username),
          getMyRecentComments(token, 5),
        ]);

        if (!isMounted) return;

        setRecentPosts(selectRecentPosts(posts));
        setRecentComments(comments);
      } catch (error) {
        console.error("Unable to load recent activity", error);
        if (isMounted) {
          setRecentPosts([]);
          setRecentComments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingActivity(false);
        }
      }
    };

    const fetchUser = async () => {
      const token = localStorage.getItem("rsp_token");
      if (!token) {
        router.replace("/login?next=/me");
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (!isMounted) return;
        setUser(currentUser);
        await fetchActivity(token, currentUser.username);
      } catch (error) {
        console.error("Unable to load current user", error);
        localStorage.removeItem("rsp_token");
        router.replace("/login?next=/me");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [router]);

  usePolling(
    async ({ isActive }) => {
      if (!user) return;

      const token = localStorage.getItem("rsp_token");
      if (!token) {
        router.replace("/login?next=/me");
        return;
      }

      try {
        const [posts, comments] = await Promise.all([
          getPublishedPostsByUsername(user.username),
          getMyRecentComments(token, 5),
        ]);

        if (!isActive()) return;
        setRecentPosts(selectRecentPosts(posts));
        setRecentComments(comments);
      } catch (error) {
        if (isAuthError(error)) {
          localStorage.removeItem("rsp_token");
          router.replace("/login?next=/me");
          return;
        }
        console.error("Unable to refresh recent activity", error);
      }
    },
    [router, user?.username],
    { enabled: !!user && !isLoadingActivity && !isLoading, intervalMs: 2000, immediate: false },
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const focus = searchParams.get("focus");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (focus === "activity" || hash === "#activity") {
      activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading, searchParams]);

  const handleTabChange = (tab: ActivityTab) => {
    setActivityTab(tab);
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("activity", tab);
    url.hash = "activity";
    router.replace(`${url.pathname}${url.search}${url.hash}`);
  };

  if (isLoading || !user) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="h1-apple text-[var(--DarkGray)]">
                How it&apos;s going, {user.display_name || user.username}?
              </h1>
              <p className="body-apple text-[var(--Gray)]">
                Manage your research profile, publications, and account settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="/me/profile" variant="secondary" size="md">
                Edit profile
              </Button>
              <Button href="/posts/new" variant="secondary" size="md">
                Create post
              </Button>
              <Button href="/" variant="primary" size="md">
                Back to browse
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <section
              ref={activityRef}
              id="activity"
              className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="h3-apple text-[var(--DarkGray)]">Recent activity</h2>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-[#FAFAFA] p-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange("posts")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      activityTab === "posts"
                        ? "bg-[var(--DarkGray)] text-[var(--White)]"
                        : "text-[var(--Gray)] hover:text-[var(--DarkGray)]"
                    }`}
                  >
                    Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange("comments")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      activityTab === "comments"
                        ? "bg-[var(--DarkGray)] text-[var(--White)]"
                        : "text-[var(--Gray)] hover:text-[var(--DarkGray)]"
                    }`}
                  >
                    Comments
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {isLoadingActivity ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 px-4 py-3"
                      >
                        <div className="space-y-2">
                          <div className="h-3 w-52 rounded-full bg-[var(--LightGray)]" />
                          <div className="h-3 w-32 rounded-full bg-[var(--LightGray)]" />
                        </div>
                        <div className="h-6 w-20 rounded-full bg-[var(--LightGray)]" />
                      </div>
                    ))}
                  </div>
                ) : activityTab === "posts" ? (
                  recentPosts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--LightGray)] bg-[#FAFAFA] px-4 py-5 text-sm text-[var(--Gray)]">
                      You don&apos;t have any posts yet.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {recentPosts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={`/posts/${post.id}`}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm shadow-soft-xs transition-colors duration-200 hover:border-[var(--Red)]"
                          >
                            <div className="min-w-0 space-y-1">
                              <p className="truncate font-medium text-[var(--DarkGray)]">
                                {truncate(post.title, 128)}
                              </p>
                              <p className="text-xs text-[var(--Gray)]">
                                {new Date(post.created_at).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-[var(--Gray)]">
                              <UpvoteIcon size='s' className="h-4 w-4" /> {post.upvotes ?? 0}
                              <DownvoteIcon size='s' className="h-4 w-4" /> {post.downvotes ?? 0}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )
                ) : recentComments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--LightGray)] bg-[#FAFAFA] px-4 py-5 text-sm text-[var(--Gray)]">
                    You don&apos;t have any comments yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {recentComments.map((comment) => (
                      <li key={comment.id}>
                        <Link
                          href={`/posts/${comment.post_id}`}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm shadow-soft-xs transition-colors duration-200 hover:border-[var(--Red)]"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium text-[var(--DarkGray)]">
                              {truncate(comment.body, 128)}
                            </p>
                            <p className="truncate text-xs text-[var(--Gray)]">
                              On: {truncate(comment.post_title || `Post #${comment.post_id}`, 128)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-[var(--Gray)]">
                            <span className="rounded-full bg-[#FAFAFA] px-2.5 py-1 text-xs">
                              ▲ {comment.upvotes ?? 0}
                            </span>
                            <span className="rounded-full bg-[#FAFAFA] px-2.5 py-1 text-xs">
                              ▼ {comment.downvotes ?? 0}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--DarkGray)]">
                    {user.display_name || user.username}
                  </h3>
                  <p className="text-xs text-[var(--Gray)]">
                    {user.affiliation || "No affiliation"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--LightGray)] py-2">
                  <span className="text-sm text-[var(--Gray)]">Username</span>
                  <span className="text-sm font-medium text-[var(--DarkGray)]">
                    {user.username}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--LightGray)] py-2">
                  <span className="text-sm text-[var(--Gray)]">Member since</span>
                  <span className="text-sm font-medium text-[var(--DarkGray)]">
                    {formatJoinedDate(user.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--Gray)]">Email</span>
                  <span className="max-w-[160px] truncate text-sm font-medium text-[var(--DarkGray)]">
                    {user.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <Link
                href="/logout"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--Red)] px-4 py-3 text-sm font-semibold text-[var(--White)] transition-colors duration-200"
              >
                <LogoutIcon className="h-4 w-4" />
                Log Out
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--Gray)]">
                Signed in as{" "}
                <span className="font-medium text-[var(--DarkGray)]">
                  {user.username}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
