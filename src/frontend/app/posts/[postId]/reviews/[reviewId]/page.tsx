"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PublicUserRead, ReviewRead } from "@/lib/api";
import { getPublicUserProfile, getReviewById } from "@/lib/api";
import ReviewVoteActions from "@/components/review-vote-actions";
import VerifiedResearcherBadge from "@/components/verified-researcher-badge";
import { Button } from "@/components/Button";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();

  const reviewId = Number(params.reviewId as string);
  const postId = Number(params.postId as string);

  const [review, setReview] = useState<ReviewRead | null>(null);
  const [reviewer, setReviewer] = useState<PublicUserRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("rsp_token") : null;
    if (!token) {
      router.replace(`/login?next=/posts/${postId}/reviews/${reviewId}`);
    }
  }, [postId, reviewId, router]);

  useEffect(() => {
    let isMounted = true;

    const fetchReview = async () => {
      try {
        setError(null);
        const data = await getReviewById(reviewId);
        if (!isMounted) return;
        setReview(data);

        try {
          const userData = await getPublicUserProfile(data.reviewer_username);
          if (!isMounted) return;
          setReviewer(userData);
        } catch {
          if (!isMounted) return;
          setReviewer(null);
        }
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "Failed to load review.");
        setReview(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReview();

    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--DarkGray)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--Gray)]">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-8 text-center shadow-soft-md">
          <h1 className="text-xl font-semibold text-[var(--DarkGray)]">
            Review not found
          </h1>
          <p className="mt-2 text-sm text-[var(--Gray)]">
            {error || "This review may have been deleted or you may not have access."}
          </p>
          <div className="mt-6 flex justify-center">
            <Button href={`/posts/${postId}/reviews`} variant="outline">
              Back to reviews
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const reviewerIsResearcher = reviewer?.role === "researcher";

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button href={`/posts/${postId}/reviews`} variant="outline">
                Back to reviews
              </Button>
              <Button href={`/posts/${postId}`} variant="ghost">
                View post
              </Button>
            </div>

            <span
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                review.is_positive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {review.is_positive ? "Positive review" : "Negative review"}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                {(review.reviewer_username || "U")[0].toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/${encodeURIComponent(review.reviewer_username)}`}
                    className="text-base font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
                  >
                    @{review.reviewer_username}
                  </Link>
                  {reviewerIsResearcher && <VerifiedResearcherBadge />}
                </div>
                <p className="text-sm text-[var(--Gray)]">
                  Reviewed{" "}
                  {new Date(review.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <ReviewVoteActions
              reviewId={review.id}
              initialUpvotes={review.upvotes}
              initialDownvotes={review.downvotes}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
          <h2 className="h3-apple text-[var(--DarkGray)]">Review</h2>
          <p className="mt-4 whitespace-pre-wrap text-[var(--DarkGray)] leading-relaxed">
            {review.body}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
            <h2 className="h3-apple text-green-700">Strengths</h2>
            <p className="mt-4 whitespace-pre-wrap text-[var(--DarkGray)] leading-relaxed">
              {review.strengths || "No strengths provided."}
            </p>
          </section>
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
            <h2 className="h3-apple text-red-700">Weaknesses</h2>
            <p className="mt-4 whitespace-pre-wrap text-[var(--DarkGray)] leading-relaxed">
              {review.weaknesses || "No weaknesses provided."}
            </p>
          </section>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/posts/${postId}`}
            className="text-sm font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
          >
            View original post →
          </Link>
          <Link
            href={`/posts/${postId}/reviews`}
            className="text-sm font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
          >
            Back to all reviews →
          </Link>
        </div>
      </div>
    </div>
  );
}

