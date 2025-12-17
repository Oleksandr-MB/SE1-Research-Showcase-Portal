"use client";

import React, { useEffect, useMemo, useState } from "react";


type ReportStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

type ReportRead = {
  id: number | string;
  title: string;
  type: string;
  status: ReportStatus;
  created_at: string;
  created_by?: string;
  view_url?: string;
  download_url?: string;
};

function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // Adjust to your auth storage
    setToken(localStorage.getItem("access_token"));
  }, []);
  return token;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function pillClasses(status: ReportStatus) {
  switch (status) {
    case "DONE":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-200";
    case "RUNNING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PENDING":
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "flex-1 px-3 py-2 text-sm transition " +
              (active
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-50")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const token = useAuthToken();

  const [reports, setReports] = useState<ReportRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReportStatus | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  async function load() {
    setLoading(true);
    setError(null);

  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let items = reports;

    if (status !== "ALL") items = items.filter((r) => r.status === status);

    if (query) {
      items = items.filter((r) => {
        const hay = `${r.title} ${r.type} ${r.created_by ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    items = [...items].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });

    return items;
  }, [reports, q, status, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Browse generated reports, filter by status, and view or download results.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-2xl border bg-white px-4 py-2 text-sm shadow-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/reports/new";
            }}
            className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm text-white shadow-sm hover:bg-zinc-800"
          >
            New report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold">Filters</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title, type, author…"
              className="w-full rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-zinc-300"
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Status</div>
            <Segmented
              value={status}
              onChange={(v) => setStatus(v as any)}
              options={[
                { value: "ALL", label: "All" },
                { value: "PENDING", label: "Pending" },
                { value: "RUNNING", label: "Running" },
                { value: "DONE", label: "Done" },
                { value: "FAILED", label: "Failed" },
              ]}
            />
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Sort</div>
            <Segmented
              value={sort}
              onChange={(v) => setSort(v as any)}
              options={[
                { value: "newest", label: "Newest" },
                { value: "oldest", label: "Oldest" },
              ]}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      ) : null}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {loading && reports.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-10 text-sm text-zinc-600 shadow-sm">
            Loading reports…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-10 text-sm text-zinc-600 shadow-sm">
            No reports found.
          </div>
        ) : (
          filtered.map((r) => (
            <div key={String(r.id)} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-base font-semibold">{r.title}</div>
                    <span className={"rounded-full border px-2 py-0.5 text-xs " + pillClasses(r.status)}>
                      {r.status}
                    </span>
                    <span className="rounded-full border bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                      {r.type}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Created {formatDate(r.created_at)}
                    {r.created_by ? ` • by ${r.created_by}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const href = r.view_url ?? `/reports/${r.id}`;
                      window.location.href = href;
                    }}
                    className="rounded-2xl border bg-white px-4 py-2 text-sm shadow-sm hover:bg-zinc-50"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={r.status !== "DONE"}
                    onClick={() => {
                      const href = r.download_url ?? `/api/reports/${r.id}/download`;
                      window.open(href, "_blank", "noopener,noreferrer");
                    }}
                    className="rounded-2xl border bg-white px-4 py-2 text-sm shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title={r.status !== "DONE" ? "Report is not ready yet" : ""}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
