"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRead } from "@/lib/api";
import { getCurrentUser } from "@/lib/api";
import { Button } from "@/components/Button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

function formatJoinedDate(createdAt: string | undefined) {
  if (!createdAt) return "Unknown member since";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Unknown member since";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
}

function QuickAction({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 shadow-soft-xs transition-all duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)] transition-colors duration-200 group-hover:bg-[var(--DarkGray)] group-hover:text-[var(--White)]">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-[var(--DarkGray)]">{label}</p>
          <p className="text-xs text-[var(--Gray)]">{description}</p>
        </div>
      </div>
      <svg
        className="h-4 w-4 text-[var(--Gray)] transition-colors duration-200 group-hover:text-[var(--DarkGray)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

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
                Welcome back, {user.display_name || user.username}
              </h1>
              <p className="body-apple text-[var(--Gray)]">
                Manage your research profile, publications, and account settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/">
                <Button variant="primary" size="md">
                  Return to the main page
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="h3-apple text-[var(--DarkGray)]">Quick Actions</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <QuickAction
                  href="/me/profile"
                  label="Edit Profile"
                  description="Update bio, links, and preferences"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                  }
                />
                <QuickAction
                  href="/posts/new"
                  label="Create New Post"
                  description="Share your research with the community"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                />
                <QuickAction
                  href={`/${user.username}`}
                  label="View Public Profile"
                  description="See how others see you"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  }
                />
                <QuickAction
                  href={`/?author=${user.username}`}
                  label="My Posts"
                  description="Browse and manage your publications"
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="h3-apple text-[var(--DarkGray)]">Recent Activity</h2>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--LightGray)] bg-[var(--LightGray)]/40 px-4 py-3">
                  <div className="h-2 w-2 rounded-full bg-[var(--DarkGray)] animate-pulse"></div>
                  <p className="text-sm text-[var(--Gray)]">
                    Activity tracking is being implemented right now.
                  </p>
                </div>
                <p className="text-sm text-[var(--Gray)]">
                  Coming soon: See your recent posts, comments, and interactions all in one place to keep track of your contributions.
                </p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                  {(user.display_name || user.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--DarkGray)]">{user.display_name || user.username}</h3>
                  <p className="text-xs text-[var(--Gray)]">{user.affiliation || "No affiliation"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--LightGray)] py-2">
                  <span className="text-sm text-[var(--Gray)]">Username</span>
                  <span className="text-sm font-medium text-[var(--DarkGray)]">{user.username}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--LightGray)] py-2">
                  <span className="text-sm text-[var(--Gray)]">Member since</span>
                  <span className="text-sm font-medium text-[var(--DarkGray)]">{formatJoinedDate(user.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--Gray)]">Email</span>
                  <span className="max-w-[160px] truncate text-sm font-medium text-[var(--DarkGray)]">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <Link
                href="/logout"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--Red)] px-4 py-3 text-sm font-semibold text-[var(--White)] transition-colors duration-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--Gray)]">
                Signed in as <span className="font-medium text-[var(--DarkGray)]">{user.username}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
