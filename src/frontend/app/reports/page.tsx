"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getAllReports,
  updateReportStatus,
  deletePost,
  deleteComment,
  getCurrentUser,
  type Report,
  type ReportStatus,
  type UserRead,
} from "@/lib/api";
import { Button } from "@/components/Button";

type ReportType = "POST" | "COMMENT" | "ALL";

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
                ? "bg-[var(--DarkGray)] text-white"
                : "bg-white text-[var(--Gray)] hover:bg-[var(--LightGray)]")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function statusBadgeClasses(status: ReportStatus) {
  switch (status.toLowerCase()) {
    case "open":
      return "bg-red-100 text-red-800 border-red-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "closed":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRead | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>("ALL");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [itemStates, setItemStates] = useState<Record<string, "deleted" | "allowed" | "exists">>({});

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
      if (!token) {
        router.replace("/login?next=/reports");
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        if (currentUser.role !== "moderator") {
          router.replace("/");
          return;
        }
        setUser(currentUser);
      } catch {
        router.replace("/login?next=/reports");
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const loadReports = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
      if (!token || !user) return;

      setLoading(true);
      setError(null);
      try {
        const targetType = reportType === "ALL" ? undefined : reportType;
        const allReports = await getAllReports(token, targetType);
        setReports(allReports);

        
        const itemStatesMap: Record<string, "deleted" | "allowed" | "exists"> = {};
        const uniqueTargets = new Map<string, { type: string; id: number }>();
        
        for (const report of allReports) {
          const key = `${report.target_type}:${report.target_id}`;
          if (!uniqueTargets.has(key)) {
            uniqueTargets.set(key, { type: report.target_type, id: report.target_id });
          }
        }

        
        for (const [key, target] of uniqueTargets) {
          
          const targetReports = allReports.filter(
            (r) => r.target_type === target.type && r.target_id === target.id,
          );
          const allClosed = targetReports.every((r) => r.status.toLowerCase() === "closed");
          
          if (allClosed) {
            itemStatesMap[key] = "allowed";
          } else {
            
            try {
              if (target.type === "POST") {
                const { getPostById } = await import("@/lib/api");
                await getPostById(target.id);
                itemStatesMap[key] = "exists";
              } else if (target.type === "COMMENT") {
                const { getCommentById } = await import("@/lib/api");
                await getCommentById(target.id);
                itemStatesMap[key] = "exists";
              }
            } catch {
              itemStatesMap[key] = "deleted";
            }
          }
        }

        setItemStates(itemStatesMap);
      } catch (err) {
        console.error("Error loading reports:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load reports");
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadReports();
    }
  }, [user, reportType]);

  const filteredReports = useMemo(() => {
    if (reportType === "ALL") return reports;
    return reports.filter((r) => r.target_type === reportType);
  }, [reports, reportType]);

  const handleAllow = async (report: Report) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
    if (!token) return;

    setError(null);
    setSuccess(null);

    const itemKey = `${report.target_type}:${report.target_id}`;
    const itemState = itemStates[itemKey];

    
    if (itemState === "deleted") {
      setError("This item has already been deleted. You cannot allow a deleted item.");
      setTimeout(() => setError(null), 5000);
      return;
    }

   
    const targetReports = reports.filter(
      (r) => r.target_type === report.target_type && r.target_id === report.target_id,
    );
    
    const allClosed = targetReports.every((r) => r.status.toLowerCase() === "closed");
    if (allClosed || itemState === "allowed") {
      setError("All reports for this item have already been resolved.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setActionLoading((prev) => ({ ...prev, [report.id]: true }));
    try {
      
      for (const targetReport of targetReports) {
        if (targetReport.status.toLowerCase() !== "closed") {
          await updateReportStatus(token, targetReport.id, "closed");
        }
      }

      
      const targetType = reportType === "ALL" ? undefined : reportType;
      const updatedReports = await getAllReports(token, targetType);
      setReports(updatedReports);
      
     
      const itemKey = `${report.target_type}:${report.target_id}`;
      setItemStates((prev) => ({ ...prev, [itemKey]: "allowed" }));
      
      setSuccess("Report resolved successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error allowing report:", err);
      if (err instanceof Error) {
        
        const message = err.message;
        if (message.includes("not found") || message.includes("404")) {
          setError("This report or the related item no longer exists.");
        } else if (message.includes("403") || message.includes("Access denied")) {
          setError("You don't have permission to perform this action.");
        } else {
          setError(message);
        }
      } else {
        setError("Failed to allow report. Please try again.");
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const handleDelete = async (report: Report) => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
    if (!token) return;

    if (!confirm(`Are you sure you want to delete this ${report.target_type.toLowerCase()}? This action cannot be undone.`)) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, [report.id]: true }));
    setError(null);
    setSuccess(null);
    
    const itemKey = `${report.target_type}:${report.target_id}`;
    const itemState = itemStates[itemKey];

    
    if (itemState === "allowed") {
      setError("This item has already been allowed. You cannot delete an allowed item.");
      setTimeout(() => setError(null), 5000);
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
      return;
    }

    
    if (itemState === "deleted") {
      setError(`This ${report.target_type.toLowerCase()} has already been deleted.`);
      setTimeout(() => setError(null), 5000);
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
      return;
    }

    try {
      
      if (report.target_type === "POST") {
        try {
          const { getPostById } = await import("@/lib/api");
          await getPostById(report.target_id);
        } catch (checkErr) {
          if (checkErr instanceof Error && (checkErr.message.includes("not found") || checkErr.message.includes("404"))) {
            setItemStates((prev) => ({ ...prev, [itemKey]: "deleted" }));
            setError("This post has already been deleted.");
            setTimeout(() => setError(null), 5000);
            return;
          }
        }
        await deletePost(token, report.target_id);
      } else if (report.target_type === "COMMENT") {
        
        const { getCommentById } = await import("@/lib/api");
        let comment;
        try {
          comment = await getCommentById(report.target_id);
        } catch (checkErr) {
          if (checkErr instanceof Error && (checkErr.message.includes("not found") || checkErr.message.includes("404"))) {
            setItemStates((prev) => ({ ...prev, [itemKey]: "deleted" }));
            setError("This comment has already been deleted.");
            setTimeout(() => setError(null), 5000);
            return;
          }
          throw checkErr;
        }
        await deleteComment(token, comment.post_id, report.target_id);
      } else {
        throw new Error(`Unknown target type: ${report.target_type}`);
      }

      
      const targetType = reportType === "ALL" ? undefined : reportType;
      const updatedReports = await getAllReports(token, targetType);
      setReports(updatedReports);
      
     
      const itemKey = `${report.target_type}:${report.target_id}`;
      setItemStates((prev) => ({ ...prev, [itemKey]: "deleted" }));
      
      setSuccess(`${report.target_type === "POST" ? "Post" : "Comment"} deleted successfully.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting item:", err);
      if (err instanceof Error) {
        
        const message = err.message;
        if (message.includes("not found") || message.includes("404")) {
          const itemType = report.target_type === "POST" ? "post" : "comment";
          setError(`This ${itemType} has already been deleted.`);
        } else if (message.includes("403") || message.includes("Not authorized") || message.includes("Access denied")) {
          setError("You don't have permission to delete this item.");
        } else if (message.includes("already been deleted")) {
          
          setError(message);
        } else {
          setError(`Failed to delete ${report.target_type.toLowerCase()}: ${message}`);
        }
      } else {
        setError("Failed to delete item. Please try again.");
      }
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md">
            <p className="text-center text-[var(--Gray)]">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="h1-apple text-[var(--DarkGray)]">Reports</h1>
              <p className="mt-1 text-sm text-[var(--Gray)]">
                Review and moderate reported content.
              </p>
            </div>
            <Button href="/" variant="primary">
              Back to browse
            </Button>
          </div>

          <div className="mb-6">
            <Segmented
              value={reportType}
              onChange={(v) => setReportType(v as ReportType)}
              options={[
                { value: "ALL", label: "All Reports" },
                { value: "POST", label: "Posts" },
                { value: "COMMENT", label: "Comments" },
              ]}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm">
              {success}
            </div>
          )}

          {loading && reports.length === 0 ? (
            <div className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-10 text-sm text-[var(--Gray)] shadow-sm">
              Loading reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-10 text-sm text-[var(--Gray)] shadow-sm">
              No reports found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClasses(report.status)}`}
                        >
                          {report.status}
                        </span>
                        <span className="rounded-full border bg-[var(--LightGray)] px-2 py-0.5 text-xs text-[var(--Gray)]">
                          {report.target_type}
                        </span>
                        <span className="text-xs text-[var(--Gray)]">
                          Target ID: {report.target_id}
                        </span>
                        <span className="text-xs text-[var(--Gray)]">
                          Report ID: {report.id}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--DarkGray)] mb-2">{report.description}</p>
                      <div className="text-xs text-[var(--Gray)]">
                        Reported {formatDate(report.created_at)} • Report ID: {report.id}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {(() => {
                        const itemKey = `${report.target_type}:${report.target_id}`;
                        const itemState = itemStates[itemKey] || "exists";
                        const targetReports = reports.filter(
                          (r) => r.target_type === report.target_type && r.target_id === report.target_id,
                        );
                        const allClosed = targetReports.every((r) => r.status.toLowerCase() === "closed");
                        const isAllowed = itemState === "allowed" || allClosed;
                        const isDeleted = itemState === "deleted";
                        const canAllow = !isAllowed && !isDeleted && !actionLoading[report.id];
                        const canDelete = !isDeleted && !isAllowed && !actionLoading[report.id];

                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAllow(report)}
                              disabled={!canAllow}
                              className="rounded-full border border-green-600 bg-white px-4 py-2 text-sm font-semibold text-green-600 shadow-sm hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title={isAllowed ? "This item has already been allowed" : isDeleted ? "This item has been deleted" : ""}
                            >
                              {actionLoading[report.id] ? "Processing..." : isAllowed ? "Allowed" : "Allow"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(report)}
                              disabled={!canDelete}
                              className="rounded-full border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              title={isDeleted ? "This item has already been deleted" : isAllowed ? "This item has been allowed" : ""}
                            >
                              {actionLoading[report.id] ? "Deleting..." : isDeleted ? "Deleted" : "Delete"}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
