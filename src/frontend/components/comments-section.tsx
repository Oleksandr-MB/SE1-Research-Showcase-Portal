"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type CommentThread,
  createComment,
  type CreateCommentPayload,
  voteOnComment,
} from "@/lib/api";

type Props = {
  postId: number;
  initialComments: CommentThread[];
};

const commentDateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDateTime = (iso: string) =>
  commentDateFormatter.format(new Date(iso));

type ThreadNode = {
  comment: CommentThread;
  replies: { comment: CommentThread; parentUsername: string }[];
};

const buildThreads = (comments: CommentThread[]): ThreadNode[] => {
  if (!comments.length) {
    return [];
  }

  const commentMap = new Map<number, CommentThread>(
    comments.map((comment) => [comment.id, comment]),
  );

  const topLevel = comments
    .filter((comment) => comment.parent_comment_id === null)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const threadMap = new Map<number, ThreadNode>(
    topLevel.map((comment) => [
      comment.id,
      { comment, replies: [] as ThreadNode["replies"] },
    ]),
  );

  const findRootId = (comment: CommentThread): number => {
    let current = comment;
    while (
      current.parent_comment_id !== null &&
      current.parent_comment_id !== undefined
    ) {
      const parent = commentMap.get(current.parent_comment_id);
      if (!parent) {
        break;
      }
      current = parent;
    }
    return current.id;
  };

  comments.forEach((comment) => {
    if (
      comment.parent_comment_id === null ||
      comment.parent_comment_id === undefined
    ) {
      return;
    }
    const parent = commentMap.get(comment.parent_comment_id);
    const parentUsername = parent?.commenter_username || "Unknown";
    const rootId =
      parent?.parent_comment_id === null || parent?.parent_comment_id === undefined
        ? parent?.id ?? comment.parent_comment_id
        : findRootId(parent!);
    const thread = threadMap.get(rootId);
    if (thread) {
      thread.replies.push({ comment, parentUsername });
    }
  });

  const threads = Array.from(threadMap.values());
  threads.forEach((thread) =>
    thread.replies.sort(
      (a, b) =>
        new Date(a.comment.created_at).getTime() -
        new Date(b.comment.created_at).getTime(),
    ),
  );
  return threads;
};

const commentVoteButtonClasses = (active: boolean, variant: "up" | "down" = "up") =>
  `flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    active
      ? (variant === "up" ? "bg-[var(--Green)] text-[var(--White)]" : "bg-[var(--Red)] text-[var(--White)]")
      : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
  } ${variant === "up" ? "UpvoteButton" : "DownvoteButton"}`;

const ArrowIcon = ({ direction }: { direction: "up" | "down" }) => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === "up" ? (
      <path d="M5 15l7-7 7 7" />
    ) : (
      <path d="M19 9l-7 7-7-7" />
    )}
  </svg>
);

export default function CommentsSection({ postId, initialComments }: Props) {
  const [comments, setComments] = useState<CommentThread[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<number, boolean>>({});
  const [activeReplyTarget, setActiveReplyTarget] = useState<number | null>(null);
  const [commentVoteState, setCommentVoteState] = useState<Record<number, -1 | 0 | 1>>({});

  const threads = useMemo(() => buildThreads(comments), [comments]);

  const requireToken = () => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rsp_token")
        : null;
    if (!token) {
      setError("Please sign in to leave a comment.");
      return null;
    }
    return token;
  };

  const submitComment = async (payload: CreateCommentPayload) => {
    const token = requireToken();
    if (!token) {
      return null;
    }

    try {
      const created = await createComment(token, postId, payload);
      setComments((prev) => [...prev, created]);
      return created;
    } catch (submissionError) {
      if (submissionError instanceof Error) {
        setError(submissionError.message);
      } else {
        setError("Unable to submit comment right now.");
      }
      return null;
    }
  };

  const handleNewComment = async () => {
    setError(null);
    const body = newComment.trim();
    if (!body) {
      setError("Comment cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    const result = await submitComment({ body });
    setIsSubmitting(false);
    if (result) {
      setNewComment("");
    }
  };

  const handleReplySubmit = async (parentCommentId: number) => {
    setError(null);
    const body = (replyBodies[parentCommentId] || "").trim();
    if (!body) {
      setError("Reply cannot be empty.");
      return;
    }

    setReplyLoading((prev) => ({ ...prev, [parentCommentId]: true }));
    const result = await submitComment({ body, parent_comment_id: parentCommentId });
    setReplyLoading((prev) => ({ ...prev, [parentCommentId]: false }));
    if (result) {
      setReplyBodies((prev) => ({ ...prev, [parentCommentId]: "" }));
      setActiveReplyTarget(null);
    }
  };

  const handleCommentVote = async (
    targetCommentId: number,
    postIdForComment: number,
    value: 1 | -1,
  ) => {
    setError(null);
    const token = requireToken();
    if (!token) {
      return;
    }
    const current = commentVoteState[targetCommentId] ?? 0;
    const nextValue = current === value ? 0 : value;
    try {
      const response = await voteOnComment(
        token,
        postIdForComment,
        targetCommentId,
        nextValue,
      );
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === targetCommentId
            ? {
                ...comment,
                upvotes: response.upvotes,
                downvotes: response.downvotes,
              }
            : comment,
        ),
      );
      setCommentVoteState((prev) => ({ ...prev, [targetCommentId]: nextValue }));
    } catch (voteError) {
      if (voteError instanceof Error) {
        setError(voteError.message);
      } else {
        setError("Unable to record your vote right now.");
      }
    }
  };

  const renderReplyComposer = (targetId: number, targetUsername: string) => {
    if (activeReplyTarget !== targetId) {
      return null;
    }
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={replyBodies[targetId] || ""}
          onChange={(event) =>
            setReplyBodies((prev) => ({
              ...prev,
              [targetId]: event.target.value,
            }))
          }
          rows={2}
          placeholder={`Reply to @${targetUsername}`}
          className="ml-1 mt-1 w-[calc(100%-0.25rem)] rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-2 text-sm text-[var(--DarkGray)] outline-none transition-colors focus:border-[var(--DarkGray)]"
        />
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveReplyTarget(null);
              setReplyBodies((prev) => ({
                ...prev,
                [targetId]: "",
              }));
            }}
            className="text-sm font-semibold text-[var(--Gray)] hover:text-[var(--DarkGray)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleReplySubmit(targetId)}
            disabled={replyLoading[targetId]}
            className="rounded-full border border-[var(--DarkGray)] px-4 py-1.5 text-xs font-semibold text-[var(--DarkGray)] transition hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {replyLoading[targetId] ? "Replying..." : "Reply"}
          </button>
        </div>
      </div>
    );
  };

  const toggleReplyTarget = (commentId: number) => {
    setActiveReplyTarget((prev) =>
      prev === commentId ? null : commentId,
    );
  };

  const renderCommentActions = (
    comment: CommentThread,
    replyButtonSize: "text-sm" | "text-xs" = "text-sm",
  ) => {
    const replyButtonClass =
      replyButtonSize === "text-xs"
        ? "text-xs font-semibold text-[var(--Gray)] transition hover:text-[var(--DarkGray)]"
        : "text-sm font-semibold text-[var(--Gray)] transition hover:text-[var(--DarkGray)]";

    const voteRowClass =
      replyButtonSize === "text-xs"
        ? "mt-2 flex items-center gap-3"
        : "flex items-center gap-3";

    return (
      <>
        <div className={voteRowClass}>
          <button
            type="button"
            onClick={() =>
              handleCommentVote(comment.id, comment.post_id, 1)
            }
            className={commentVoteButtonClasses(
              commentVoteState[comment.id] === 1,
              "up",
            )}
            aria-label="Upvote comment"
          >
            <ArrowIcon direction="up" />
            <span>{comment.upvotes}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleCommentVote(comment.id, comment.post_id, -1)
            }
            className={commentVoteButtonClasses(
              commentVoteState[comment.id] === -1,
              "down",
            )}
            aria-label="Downvote comment"
          >
            <ArrowIcon direction="down" />
            <span>{comment.downvotes}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => toggleReplyTarget(comment.id)}
          className={replyButtonClass}
        >
          Reply
        </button>
      </>
    );
  };

  return (
    <section>
      <div className="space-y-6 rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-5">
        <h2 className="ml-3 h3-apple text-[var(--DarkGray)]">Comments</h2>
        <div className="space-y-3">
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            rows={3}
            placeholder="Add a comment..."
            className="ml-3 mt-1 w-[calc(100%-0.75rem)] rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none transition-colors focus:border-[var(--DarkGray)]"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setNewComment("")}
              className="text-sm font-semibold text-[var(--Gray)] hover:text-[var(--DarkGray)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNewComment}
              disabled={isSubmitting}
              className="rounded-full bg-[var(--DarkGray)] px-5 py-2 text-sm font-semibold text-[var(--White)] transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Posting..." : "Comment"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

      <ul className="space-y-6">
        {threads.length === 0 ? (
          <li className="rounded-3xl border border-dashed border-[var(--LightGray)] px-4 py-10 text-center text-sm text-[var(--Gray)]">
            No comments yet. Start the conversation!
          </li>
        ) : (
          threads.map(({ comment, replies }, index) => (
            <li
              key={comment.id}
              className={`space-y-4 rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-5 shadow-soft-xs ${
                index === threads.length - 1 ? "" : "mb-4"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--Gray)]">
                  <Link
                    href={`/${encodeURIComponent(comment.commenter_username)}`}
                    className="font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
                  >
                    {comment.commenter_username}
                  </Link>
                  <span>{formatDateTime(comment.created_at)}</span>
                </div>
                <p className="text-[var(--DarkGray)]">{comment.body}</p>
                {renderCommentActions(comment, "text-sm")}

                {renderReplyComposer(comment.id, comment.commenter_username)}
              </div>

              {replies.length > 0 && (
                <div className="ml-6 pl-6">
                  {replies.map(({ comment: replyComment, parentUsername }) => (
                    <div
                      key={replyComment.id}
                      className="mb-4 rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 text-sm shadow-soft-xs"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--Gray)]">
                        <span className="font-semibold text-[var(--DarkGray)]">
                          {replyComment.commenter_username}
                        </span>
                        <span>{formatDateTime(replyComment.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[var(--DarkGray)]">
                        <span className="font-semibold text-[var(--DarkGray)]">
                          @{parentUsername}
                        </span>{" "}
                        {replyComment.body}
                      </p>
                      {renderCommentActions(replyComment, "text-xs")}
                      <div className="mt-2">
                        {renderReplyComposer(
                          replyComment.id,
                          replyComment.commenter_username,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))
        )}
      </ul>
      </div>
    </section>
  );
}
