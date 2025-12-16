"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PostRead, ReviewRead, UserRead } from "@/lib/api";
import { getCurrentUser, getPostById, getPostReviews } from "@/lib/api";
import ReviewVoteActions from "@/components/review-vote-actions";
import { Button } from "@/components/Button";

export default function ReviewsFeedPage() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.postId as string);

  const [post, setPost] = useState<PostRead | null>(null);
  const [currentUser, setCurrentUser] = useState<UserRead | null>(null);
  const [reviews, setReviews] = useState<ReviewRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("rsp_token") : null;
    if (!token) {
      router.replace(`/login?next=/posts/${postId}/reviews`);
    }
  }, [postId, router]);

  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        setError(null);
        setActionError(null);

        const token =
          typeof window !== "undefined" ? localStorage.getItem("rsp_token") : null;
        if (!token) {
          router.replace(`/login?next=/posts/${postId}/reviews`);
          return;
        }

        const [reviewsData, postData, userData] = await Promise.all([
          getPostReviews(postId),
          getPostById(postId),
          getCurrentUser(token),
        ]);
        if (!isMounted) return;

        setReviews(reviewsData);
        setPost(postData);
        setCurrentUser(userData);
      } catch (e) {
        if (!isMounted) return;
        const message = e instanceof Error ? e.message : "Failed to load reviews.";
        setError(message);
        if (message.includes("(401)") || message.toLowerCase().includes("token")) {
          router.replace(`/login?next=/posts/${postId}/reviews`);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [postId, router]);

  const canWriteReview = useMemo(() => {
    if (!post || !currentUser) return false;
    if (currentUser.role !== "researcher") return false;
    if (currentUser.id === post.poster_id) return false;
    if (reviews.some((r) => r.reviewer_username === currentUser.username)) return false;
    return true;
  }, [currentUser, post, reviews]);

  const reviewEligibilityMessage = useMemo(() => {
    if (!post || !currentUser) return "Unable to verify review permissions.";
    if (currentUser.role !== "researcher") return "Only researchers can write reviews.";
    if (currentUser.id === post.poster_id) return "You cannot review your own post.";
    if (reviews.some((r) => r.reviewer_username === currentUser.username)) {
      return "You have already reviewed this post.";
    }
    return null;
  }, [currentUser, post, reviews]);

  const handleWriteReview = () => {
    setActionError(null);
    if (!canWriteReview) {
      setActionError(reviewEligibilityMessage || "You cannot write a review.");
      return;
    }
    window.open(`/posts/${postId}/review`, "_blank");
  };

  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return list;
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--DarkGray)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--Gray)]">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="h1-apple text-[var(--DarkGray)]">Reviews</h1>
              <p className="text-sm text-[var(--Gray)]">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"} •{" "}
                {post?.title ? post.title : `Post #${postId}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={handleWriteReview}>
                Write a review
              </Button>
              <Button type="button" variant="primary" href={`/posts/${postId}`}>
                Back to post
              </Button>
            </div>
          </div>

          {actionError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {actionError}
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {reviews.length === 0 ? (
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-10 text-center shadow-soft-sm">
            <p className="text-sm text-[var(--Gray)]">No reviews yet for this post.</p>
            <div className="mt-5 flex justify-center">
              <Button
                type="button"
                variant="primary"
                onClick={handleWriteReview}
              >
                Be the first to review
              </Button>
            </div>
          </section>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <article
                key={review.id}
                className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm transition-colors hover:border-[var(--DarkGray)]"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--LightGray)] text-sm font-semibold text-[var(--DarkGray)]">
                          {(review.reviewer_username || "U")[0].toUpperCase()}
                        </div>
                        <Link
                          href={`/${encodeURIComponent(review.reviewer_username)}`}
                          className="text-sm font-medium text-[var(--DarkGray)] hover:text-[var(--Red)]"
                        >
                          @{review.reviewer_username}
                        </Link>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          review.is_positive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {review.is_positive ? "Positive" : "Negative"}
                      </span>

                      <span className="text-xs text-[var(--Gray)]">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-[var(--DarkGray)] line-clamp-3">
                      {review.body}
                    </p>

                    {(review.strengths || review.weaknesses) && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {review.strengths && (
                          <div className="rounded-2xl border border-[var(--LightGray)] bg-[#FAFAFA] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                              Strengths
                            </p>
                            <p className="mt-1 text-sm text-[var(--DarkGray)] line-clamp-3">
                              {review.strengths}
                            </p>
                          </div>
                        )}
                        {review.weaknesses && (
                          <div className="rounded-2xl border border-[var(--LightGray)] bg-[#FAFAFA] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                              Weaknesses
                            </p>
                            <p className="mt-1 text-sm text-[var(--DarkGray)] line-clamp-3">
                              {review.weaknesses}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--LightGray)] pt-4">
                      <Link
                        href={`/posts/${postId}/reviews/${review.id}`}
                        className="inline-flex items-center text-sm font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
                      >
                        Read full review →
                      </Link>
                      <span className="text-xs text-[var(--Gray)]">
                        Score: {(review.upvotes ?? 0) - (review.downvotes ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/*<div className="shrink-0">*/}
                  {/*  <ReviewVoteActions*/}
                  {/*    reviewId={review.id}*/}
                  {/*    initialUpvotes={review.upvotes}*/}
                  {/*    initialDownvotes={review.downvotes}*/}
                  {/*  />*/}
                  {/*</div>*/}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
