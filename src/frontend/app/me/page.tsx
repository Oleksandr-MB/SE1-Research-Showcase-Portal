"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRead } from "@/lib/api";
import { getCurrentUser } from "@/lib/api";

// Mock data for design showcase

const fallbackProfile = {
  name: "Dr. Alex Warren",
  role: "Computational Neuroscience",
  institution: "Signal Intelligence Lab, SE1",
  bio: "Modeling neural plasticity with transformer-inspired circuits. Leading the adaptive cognition project within SE1 Research Showcase.",
  stats: [
    { label: "Publications", value: "18" },
    { label: "Active reviews", value: "4" },
    { label: "Community score", value: "1.2k" },
  ],
};

const activeProjects = [
  {
    id: 27,
    title: "Neuromorphic Agents for Emotion Recognition",
    status: "Draft",
    updated: "2 days ago",
    action: "Resume writing",
  },
  {
    id: 12,
    title: "Brain-inspired Control Loops for Soft Robotics",
    status: "In review",
    updated: "5 days ago",
    action: "Track peer feedback",
  },
];

const bookmarks = [
  {
    id: 8,
    title: "Adaptive Flood Forecasting with Multi-Modal Sensors",
    authors: "I. Okafor · H. Singh",
  },
  {
    id: 19,
    title: "Privacy-Preserving Genomics Pipelines",
    authors: "S. Kapoor · D. Yeung",
  },
];

const activity = [
  {
    timestamp: "Today · 09:42",
    summary: "You replied to a reviewer on Adaptive Neural Meshes.",
  },
  {
    timestamp: "Yesterday · 15:23",
    summary: "Received 6 upvotes on Adaptive Flood Forecasting.",
  },
  {
    timestamp: "Mon · 18:05",
    summary: "Scheduled feedback session with Moderator Lane.",
  },
];

export default function PersonalLab() {
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("rsp_token")
          : null;

      if (!token) {
        if (isMounted) {
          setIsLoading(false);
        }
        router.replace("/login?next=/me");
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (!isMounted) {
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error("Unable to load current user", error);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("rsp_token");
        }
        router.replace("/login?next=/me");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading your lab...
      </div>
    );
  }

  const formattedRole =
    user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const joinedDate = new Date(user.created_at).toLocaleDateString();

  const displayProfile = {
    name: user.username || fallbackProfile.name,
    role: formattedRole,
    institution: `Member since ${joinedDate}`,
    bio: `Reach me at ${user.email}`,
    stats: fallbackProfile.stats,
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-24 pt-12 sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="grid gap-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm lg:grid-cols-[2fr_1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
              Personal lab
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">
              {displayProfile.name}
            </h1>
            <p className="text-lg text-slate-600">{displayProfile.role}</p>
            <p className="mt-4 text-base text-slate-500">
              {displayProfile.bio}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {displayProfile.institution}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/posts/new"
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
              >
                Draft new post
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900"
              >
                Update profile
              </Link>
              <Link
                href="/logout"
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900"
              >
                Sign out
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <p className="text-sm uppercase tracking-wide text-white/70">
              Snapshot
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {displayProfile.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-semibold">{stat.value}</p>
                  <p className="text-sm text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Active submissions
              </h2>
              <Link
                href="/posts"
                className="text-sm font-medium text-indigo-600"
              >
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {activeProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {project.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {project.status} · Updated {project.updated}
                      </p>
                    </div>
                    <Link
                      href={`/posts/${project.id}`}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                    >
                      {project.action}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Reading queue
              </h3>
              <p className="text-sm text-slate-500">
                Posts you starred for later review.
              </p>
            </div>
            <ul className="space-y-4">
              {bookmarks.map((item) => (
                <li
                  key={`bookmark-${item.id}`}
                  className="rounded-2xl border border-slate-100 p-4"
                >
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.authors}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Activity timeline
            </h3>
            <ul className="mt-4 space-y-4">
              {activity.map((item, index) => (
                <li key={`activity-${index}`} className="space-y-1">
                  <p className="text-sm text-slate-500">{item.timestamp}</p>
                  <p className="text-base text-slate-800">{item.summary}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Next actions
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Upload supplementary figures for Neuromorphic Agents draft.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Send reminder to Moderator Lane about scheduled review.
              </li>
              <li className="rounded-2xl bg-slate-50 px-4 py-3">
                Curate five references tagged &ldquo;privacy&rdquo; for upcoming
                panel.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
