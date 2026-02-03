"use client";

import { useState } from "react";
import { TrashIcon } from "@/components/icons/ui";
import { deleteComment } from "@/lib/api";

type Props = {
  postId: number;
  commentId: number;
  isOwner: boolean;
  onDeleted?: () => void;
};

/**
 * DeleteCommentButton Component
 * 
 * A button component that allows comment owners to delete their comments.
 * Only visible to the user who created the comment.
 * Shows a confirmation dialog before deletion with the text:
 * "Are you sure you want to delete this comment?"
 * 
 * @param postId - The ID of the post the comment belongs to
 * @param commentId - The ID of the comment to delete
 * @param isOwner - Whether the current user owns the comment
 * @param onDeleted - Optional callback after successful deletion
 */
export default function DeleteCommentButton({ postId, commentId, isOwner, onDeleted }: Props) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render the button if the user is not the owner
  if (!isOwner) {
    return null;
  }

  const handleDeleteClick = () => {
    setShowConfirmation(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("rsp_token") : null;
    if (!token) {
      setError("Please sign in to delete this comment.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteComment(token, postId, commentId);
      
      // Call the onDeleted callback if provided
      if (onDeleted) {
        onDeleted();
      }
      
      // Close the confirmation dialog
      setShowConfirmation(false);
    } catch (deleteError) {
      console.error("Error deleting comment:", deleteError);
      if (deleteError instanceof Error) {
        setError(deleteError.message);
      } else {
        setError("Unable to delete comment. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!showConfirmation) {
    return (
      <button
        type="button"
        onClick={handleDeleteClick}
        className="flex items-center justify-center rounded-full border border-[#E5E5E5] p-2 text-xs font-semibold text-[var(--Red)] transition hover:border-[var(--Red)] hover:bg-[var(--Red)] hover:text-[var(--White)]"
        aria-label="Delete comment"
        title="Delete comment"
      >
        <TrashIcon />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-[var(--Red)] bg-[var(--White)] p-4 shadow-soft-sm">
        <div className="mb-3">
          <p className="text-sm font-semibold text-[var(--DarkGray)]">
            Are you sure you want to delete this comment?
          </p>
          <p className="mt-1 text-xs text-[var(--Gray)]">
            This action cannot be undone.
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="flex-1 rounded-full bg-[var(--Red)] px-4 py-2 text-sm font-semibold text-[var(--White)] transition hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDeleting}
            className="flex-1 rounded-full border border-[#E5E5E5] px-4 py-2 text-sm font-semibold text-[var(--DarkGray)] transition hover:border-[var(--DarkGray)] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
