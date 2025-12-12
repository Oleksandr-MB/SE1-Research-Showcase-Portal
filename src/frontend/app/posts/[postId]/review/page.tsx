"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { Button } from "@/components/Button";
import type { UserRead } from "@/lib/api";
import { getCurrentUser, createReview, getPostById, type PostRead } from "@/lib/api";

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const numericPostId = Number(postId);
  
  const [user, setUser] = useState<UserRead | null>(null);
  const [post, setPost] = useState<PostRead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  
  const [reviewBody, setReviewBody] = useState("");
  const [isPositive, setIsPositive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuthorizationAndFetchPost = async () => {
      const storedToken = localStorage.getItem("rsp_token");
      if (!storedToken) {
        router.replace(`/login?next=/posts/${postId}/review`);
        return;
      }

      setToken(storedToken);

      try {
        const currentUser = await getCurrentUser(storedToken);
        if (!isMounted) return;

        // Only researchers can access the review page
        const isResearcher = currentUser.role === "researcher";

        if (!isResearcher) {
          router.replace(`/posts/${postId}`);
          return;
        }

        setUser(currentUser);

        // Fetch the post
        try {
          const postData = await getPostById(numericPostId);
          if (isMounted) {
            setPost(postData);
          }
        } catch (err) {
          console.error("Failed to fetch post:", err);
          if (isMounted) {
            setError("Failed to load post details");
          }
        }
      } catch (error) {
        console.error("Unable to fetch user:", error);
        router.replace(`/login?next=/posts/${postId}/review`);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkAuthorizationAndFetchPost();
    return () => {
      isMounted = false;
    };
  }, [postId, numericPostId, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("You need to be signed in to submit a review.");
      return;
    }

    if (!reviewBody.trim()) {
      setError("Review body cannot be empty.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReview(token, numericPostId, {
        body: reviewBody,
        is_positive: isPositive,
      });

      setSuccess("Review submitted successfully!");
      setReviewBody("");
      setIsPositive(true);

      // Redirect back to post after 1.5 seconds
      setTimeout(() => {
        window.opener?.location.reload();
        window.close();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--DarkGray)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--Gray)]">Loading review page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F5F5] to-[#F3F3F3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="h1-apple text-[var(--DarkGray)]">Review Post #{postId}</h1>
              <p className="body-apple text-[var(--Gray)] mt-2">
                Logged in as <span className="font-medium">{user?.username}</span>
              </p>
            </div>
            <button
              onClick={() => window.close()}
              className="text-sm font-medium text-[var(--DarkGray)] hover:text-[var(--Gray)] transition"
            >
              Close
            </button>
          </div>
          <div className="divider-subtle"></div>
        </div>

        {/* Post Preview */}
        {post && (
          <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-6 shadow-soft-sm mb-8">
            <h2 className="h3-apple text-[var(--DarkGray)] mb-3">{post.title}</h2>
            <p className="text-sm text-[var(--Gray)] mb-4">
              By <span className="font-medium">@{post.poster_username}</span>
            </p>
            {post.abstract && (
              <p className="text-sm text-[var(--DarkGray)] leading-relaxed">
                {post.abstract}
              </p>
            )}
          </div>
        )}

        {/* Review Form */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-gradient-to-br from-[var(--White)] to-transparent p-6 sm:p-8 shadow-soft-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-scale-in">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {success}
                </div>
              </div>
            )}

            {/* Sentiment Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-3">
                Review Sentiment
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsPositive(true)}
                  className={`flex-1 rounded-2xl px-4 py-3 font-medium transition ${
                    isPositive
                      ? "bg-green-500 text-white border border-green-600"
                      : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)]"
                  }`}
                >
                  <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Positive Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsPositive(false)}
                  className={`flex-1 rounded-2xl px-4 py-3 font-medium transition ${
                    !isPositive
                      ? "bg-[var(--Red)] text-white border border-red-600"
                      : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)]"
                  }`}
                >
                  <svg className="h-5 w-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Negative Review
                </button>
              </div>
            </div>

            {/* Review Body */}
            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Review Body
              </label>
              <textarea
                required
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={12}
                className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                  outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                  focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                placeholder="Write your detailed review here. Include your observations, comments, and recommendations for improvement..."
              />
              <p className="text-xs text-[#8A8A8A] mt-2">
                {reviewBody.length} / 10000 characters
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-[var(--DarkGray)] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </button>
              <button
                type="button"
                onClick={() => window.close()}
                className="flex-1 rounded-2xl border border-[#E5E5E5] px-6 py-3 text-sm font-semibold text-[var(--DarkGray)] transition hover:bg-[#F3F3F3]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

