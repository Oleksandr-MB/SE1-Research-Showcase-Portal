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

function QuickAction({ href, label, description, icon }: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between p-4 rounded-xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] 
        hover:border-[var(--primary_accent)] hover:shadow-soft-sm transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent 
          group-hover:from-[var(--primary_accent)] group-hover:to-[var(--DarkRedLight)] transition-all duration-300">
          <div className="text-[var(--titles)] group-hover:text-white transition-colors">
            {icon}
          </div>
        </div>
        <div>
          <p className="font-medium text-[var(--titles)]">{label}</p>
          <p className="text-xs text-[var(--muted_text_soft)] mt-0.5">{description}</p>
        </div>
      </div>
      <svg className="w-4 h-4 text-[var(--muted_text)] group-hover:text-[var(--primary_accent)] transition-colors" 
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    return () => { isMounted = false; };
  }, [router]);

  if (isLoading || !user) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--page_background)] to-[var(--surface_muted)] animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="h1-apple mb-2">Welcome back, {user.display_name || user.username}</h1>
              <p className="body-apple text-[var(--muted_text)]">
                Manage your research profile, publications, and account settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="md">
                  Back to Search
                </Button>
              </Link>
              <Link href="/posts/new">
                <Button variant="primary" size="md">
                  New Post
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <section>
              <h2 className="h3-apple mb-4 text-[var(--titles)]">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <QuickAction
                  href="/me/profile"
                  label="Edit Profile"
                  description="Update bio, links, and preferences"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  }
                />
                <QuickAction
                  href="/posts/new"
                  label="Create New Post"
                  description="Share your research with the community"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                />
                <QuickAction
                  href={`/${user.username}`}
                  label="View Public Profile"
                  description="See how others see you"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                />
                <QuickAction
                  href={`/search?author=${user.username}`}
                  label="My Posts"
                  description="Browse and manage your publications"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  }
                />
              </div>
            </section>

            {/* Recent Activity (Placeholder) */}
            <section>
              <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="h3-apple text-[var(--titles)]">Recent Activity</h2>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-gradient-to-r from-[var(--surface_secondary)] to-transparent text-[var(--muted_text)]">
                    Coming Soon
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface_muted)]">
                    <div className="h-2 w-2 rounded-full bg-[var(--primary_accent)] animate-pulse"></div>
                    <div>
                      <p className="text-sm text-[var(--muted_text)]">Activity tracking is being implemented</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted_text_soft)]">
                    This section will show your recent posts, reviews, and interactions with other researchers.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Card */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-b from-[var(--surface_primary)] to-transparent p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--primary_accent)] to-[var(--DarkRedLight)] 
                  flex items-center justify-center text-white font-semibold">
                  {(user.display_name || user.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--titles)]">{user.display_name || user.username}</h3>
                  <p className="text-xs text-[var(--muted_text)]">{user.affiliation || "No affiliation"}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[var(--border_on_surface_soft)]">
                  <span className="text-sm text-[var(--muted_text)]">Username</span>
                  <span className="text-sm font-medium text-[var(--titles)]">{user.username}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border_on_surface_soft)]">
                  <span className="text-sm text-[var(--muted_text)]">Member since</span>
                  <span className="text-sm font-medium text-[var(--titles)]">{formatJoinedDate(user.created_at)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--muted_text)]">Email</span>
                  <span className="text-sm font-medium text-[var(--titles)] truncate max-w-[160px]">{user.email}</span>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-b from-[var(--surface_primary)] to-transparent p-6">
              <h3 className="h3-apple mb-4 text-[var(--titles)]">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#10B981]"></div>
                    <span className="text-sm text-[var(--titles)]">Email Verified</span>
                  </div>
                  <svg className="w-5 h-5 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[var(--muted_text_soft)]"></div>
                    <span className="text-sm text-[var(--titles)]">Profile Complete</span>
                  </div>
                  <Link href="/me/profile" className="text-xs text-[var(--primary_accent)] hover:underline">
                    Complete
                  </Link>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-b from-[var(--surface_primary)] to-transparent p-6">
              <Link
                href="/logout"
                className="group flex items-center justify-center gap-2 w-full p-3 rounded-xl 
                  bg-gradient-to-r from-[#FEE2E2] to-transparent hover:from-[#FECACA] 
                  text-[#DC2626] transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-medium">Log Out</span>
              </Link>
              <p className="text-xs text-[var(--muted_text_soft)] mt-3 text-center">
                You are logged in as <span className="font-medium text-[var(--titles)]">{user.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}