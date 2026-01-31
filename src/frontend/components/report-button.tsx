"use client";

import { useState } from "react";
import { FlagIcon } from "@/components/icons/ui";
import { createPostReport, createCommentReport, type ReportCreatePayload } from "@/lib/api";

type Props = {
  postId: number;
  commentId?: number;
  onReported?: () => void;
};

export default function ReportButton({ postId, commentId, onReported }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
    if (!token) {
      setError("Please sign in to report content.");
      return;
    }
    setIsOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDescription("");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async () => {
    setError(null);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
    if (!token) {
      setError("Please sign in to report content.");
      return;
    }

    const trimmed = description.trim();
    if (!trimmed) {
      setError("Please provide a reason for reporting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ReportCreatePayload = { description: trimmed };
      
      if (commentId) {
        console.log("Creating comment report:", { postId, commentId, payload });
        await createCommentReport(token, postId, commentId, payload);
      } else {
        console.log("Creating post report:", { postId, payload });
        await createPostReport(token, postId, payload);
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onReported) {
          onReported();
        }
      }, 1000);
    } catch (reportError) {
      console.error("Error creating report:", reportError);
      if (reportError instanceof Error) {
        setError(reportError.message);
      } else {
        setError("Unable to submit report. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center rounded-full border border-[#E5E5E5] p-2 text-[var(--Gray)] transition hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
        aria-label="Report content"
      >
        <FlagIcon />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-4 shadow-soft-sm">
        <div className="mb-3">
          <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
            Why are you reporting this {commentId ? "comment" : "post"}?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Please provide a reason for reporting..."
            className="w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-2 text-sm text-[var(--DarkGray)] outline-none transition-colors focus:border-[var(--DarkGray)]"
          />
        </div>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        {success && <p className="text-xs text-green-600 mb-2">Report submitted successfully!</p>}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-sm font-semibold text-[var(--Gray)] hover:text-[var(--DarkGray)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className="rounded-full bg-[var(--DarkGray)] hover:bg-[var(--Black)] px-4 py-1.5 text-xs font-semibold text-[var(--White)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

