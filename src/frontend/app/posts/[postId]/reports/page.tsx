"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { createPostReport } from "@/lib/api";

export default function PostReportPage() {
  const params = useParams();
  const postId = Number(params.postId as string);

  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;
    if (!token) {
      setError("Please sign in to report this post.");
      return;
    }

    const trimmed = description.trim();
    if (!trimmed) {
      setError("Please provide a reason for reporting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPostReport(token, postId, { description: trimmed });
      setDescription("");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <h1 className="h1-apple text-[var(--DarkGray)]">Report post</h1>
          <p className="mt-2 text-sm text-[var(--Gray)]">
            Reports are reviewed by moderators. Please provide as much detail as
            possible.
          </p>

          <div className="mt-6 space-y-3">
            <label className="block text-sm font-semibold text-[var(--DarkGray)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Why are you reporting this post?"
              className="w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none transition-colors focus:border-[var(--DarkGray)]"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-green-700">
                Report submitted successfully.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Submit report
              </Button>
              <Link
                href={`/posts/${postId}`}
                className="text-sm font-semibold text-[var(--Gray)] hover:text-[var(--DarkGray)]"
              >
                Cancel
              </Link>
              <Link
                href={`/login?next=/posts/${postId}/reports`}
                className="text-sm font-semibold text-[var(--Gray)] hover:text-[var(--DarkGray)]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
