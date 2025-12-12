"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReviewRead, getPostReviews } from "@/lib/api";
import ReviewVoteActions from "@/components/review-vote-actions";
import Link from "next/link";

type SortOption = "popular" | "newest" | "oldest";

export default function ReviewsFeedPage() {
  const params = useParams();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewRead[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const postId = parseInt(params.postId as string);

  useEffect(() => {
    const token = localStorage.getItem("rsp_token");
    if (!token) {
      alert("Please log in to view reviews");
      router.push(`/posts/${postId}`);
      return;
    }
    setIsLoggedIn(true);
  }, [postId, router]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchReviews = async () => {
      try {
        const data = await getPostReviews(postId);
        setReviews(data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        alert("Failed to load reviews");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [postId, isLoggedIn]);

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] flex items-center justify-center">
        <p className="text-lg text-[var(--Gray)]">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[var(--DarkGray)]">Reviews</h1>
          <Link
            href={`/posts/${postId}`}
            className="inline-flex items-center justify-center font-medium transition-all duration-300 ease-apple rounded-full px-5 py-2.5 text-sm bg-transparent text-[var(--DarkGray)] border border-[#E5E5E5] hover:border-[var(--DarkGray)] focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            ← Back to Post
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-[var(--Gray)]">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--Gray)]">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded border border-[var(--LightGray)] bg-white px-3 py-1.5 text-sm text-[var(--DarkGray)] focus:outline-none focus:ring-2 focus:ring-[var(--Red)]"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-3xl border border-[var(--LightGray)] bg-white p-8 text-center">
            <p className="text-[var(--Gray)]">No reviews yet for this post.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-3xl border border-[var(--LightGray)] bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <p className="text-sm font-medium text-[var(--DarkGray)]">
                        @{review.reviewer_username}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                    <p className="mb-4 text-sm text-[var(--DarkGray)] line-clamp-3">
                      {review.body}
                    </p>
                    <Link
                      href={`/posts/${postId}/reviews/${review.id}`}
                      className="inline-flex items-center text-sm font-medium text-[var(--DarkGray)] hover:text-[var(--Black)] transition-colors"
                    >
                      Read full review →
                    </Link>
                  </div>
                  <ReviewVoteActions
                    reviewId={review.id}
                    initialUpvotes={review.upvotes}
                    initialDownvotes={review.downvotes}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
