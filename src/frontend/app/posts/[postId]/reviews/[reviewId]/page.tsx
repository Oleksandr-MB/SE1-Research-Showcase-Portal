"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReviewRead, getReviewById } from "@/lib/api";
import ReviewVoteActions from "@/components/review-vote-actions";
import VerifiedResearcherBadge from "@/components/verified-researcher-badge";
import Link from "next/link";

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [review, setReview] = useState<ReviewRead | null>(null);
  const [reviewerRole, setReviewerRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reviewId = parseInt(params.reviewId as string);
  const postId = parseInt(params.postId as string);

  useEffect(() => {
    const token = localStorage.getItem("rsp_token");
    if (!token) {
      alert("Please log in to view review details");
      router.push(`/posts/${postId}`);
      return;
    }

    const fetchReview = async () => {
      try {
        const data = await getReviewById(reviewId);
        setReview(data);

        // Fetch reviewer details to check if they're a researcher
        const userResponse = await fetch(
          `http://localhost:8000/users/${encodeURIComponent(data.reviewer_username)}`
        );
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setReviewerRole(userData.role);
        }
      } catch (error) {
        console.error("Error fetching review:", error);
        alert("Failed to load review");
        router.push(`/posts/${postId}/reviews`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, postId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] flex items-center justify-center">
        <p className="text-lg text-[var(--Gray)]">Loading review...</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] flex items-center justify-center">
        <p className="text-lg text-[var(--Gray)]">Review not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/posts/${postId}/reviews`}
            className="inline-flex items-center justify-center font-medium transition-all duration-300 ease-apple rounded-full px-5 py-2.5 text-sm bg-transparent text-[var(--DarkGray)] border border-[#E5E5E5] hover:border-[var(--DarkGray)] focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            ← Back to Reviews
          </Link>
        </div>

        <div className="rounded-3xl border border-[var(--LightGray)] bg-white p-8 shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                {review.reviewer_username[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${encodeURIComponent(review.reviewer_username)}`}
                    className="text-base font-medium text-[var(--DarkGray)] hover:text-[var(--Red)]"
                  >
                    @{review.reviewer_username}
                  </Link>
                  {reviewerRole === "researcher" && <VerifiedResearcherBadge />}
                </div>
                <p className="text-sm text-[var(--Gray)]">
                  Reviewed on{" "}
                  {new Date(review.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                review.is_positive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {review.is_positive ? "✓ Positive Review" : "✗ Negative Review"}
            </span>
          </div>

          <div className="mb-6">
            <ReviewVoteActions
              reviewId={review.id}
              initialUpvotes={review.upvotes}
              initialDownvotes={review.downvotes}
            />
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-[var(--DarkGray)]">Review</h2>
              <p className="text-[var(--DarkGray)] whitespace-pre-wrap leading-relaxed">
                {review.body}
              </p>
            </div>

            {review.strengths && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-green-700">Strengths</h2>
                <p className="text-[var(--DarkGray)] whitespace-pre-wrap leading-relaxed">
                  {review.strengths}
                </p>
              </div>
            )}

            {review.weaknesses && (
              <div>
                <h2 className="mb-2 text-lg font-semibold text-red-700">Weaknesses</h2>
                <p className="text-[var(--DarkGray)] whitespace-pre-wrap leading-relaxed">
                  {review.weaknesses}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--LightGray)]">
            <Link
              href={`/posts/${postId}`}
              className="inline-flex items-center text-sm font-medium text-[var(--DarkGray)] hover:text-[var(--Black)] transition-colors"
            >
              View original post →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
