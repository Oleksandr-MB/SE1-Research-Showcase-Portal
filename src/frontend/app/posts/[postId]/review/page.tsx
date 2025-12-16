"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { Button } from "@/components/Button";
import type { UserRead } from "@/lib/api";
import { getCurrentUser, createReview, getPostById, type PostRead } from "@/lib/api";
import {
  CheckCircleSolidIcon,
  DownvoteIcon,
  UpvoteIcon,
  XCircleSolidIcon,
} from "@/components/icons";

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
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
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

        // Fetch the post
        try {
          const postData = await getPostById(numericPostId);
          if (!isMounted) return;

          // If researcher is the author, redirect back to post
          if (currentUser.id === postData.poster_id) {
            router.replace(`/posts/${postId}`);
            return;
          }

          setUser(currentUser);
          setPost(postData);
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

    if (!strengths.trim() || !weaknesses.trim()) {
      setError("Please fill in both strengths and weaknesses.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReview(token, numericPostId, {
        body: reviewBody,
        is_positive: isPositive,
        strengths,
        weaknesses,
      });

      setSuccess("Review submitted successfully!");
      setReviewBody("");
      setIsPositive(true);
      setStrengths("");
      setWeaknesses("");

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
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="h1-apple text-[var(--DarkGray)]">Write a review</h1>
              <p className="text-sm text-[var(--Gray)]">
                Reviewing post #{postId} as{" "}
                <span className="font-medium text-[var(--DarkGray)]">
                  @{user?.username}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button href={`/posts/${postId}`} variant="outline">
                Back to post
              </Button>
              <button
                type="button"
                onClick={() => window.close()}
                className="text-sm font-semibold text-[var(--DarkGray)] hover:text-[var(--Red)]"
              >
                Close window
              </button>
            </div>
          </div>
        </section>

        {/* Post Preview */}
        {post && (
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
              Post preview
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--DarkGray)]">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-[var(--Gray)]">
              By{" "}
              <span className="font-medium text-[var(--DarkGray)]">
                @{post.poster_username}
              </span>
            </p>
            {post.abstract && (
              <p className="mt-4 text-sm text-[var(--DarkGray)] leading-relaxed">
                {post.abstract}
              </p>
            )}
          </section>
        )}

        {/* Review Form */}
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <XCircleSolidIcon className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-scale-in">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircleSolidIcon className="w-4 h-4" />
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
                      ? "bg-[var(--Green)] text-[var(--White)] border border-[var(--Green)]"
                      : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)]"
                  }`}
                >
                  <UpvoteIcon size="l" className="mr-2" />
                  Positive Review
                </button>
                <button
                  type="button"
                  onClick={() => setIsPositive(false)}
                  className={`flex-1 rounded-2xl px-4 py-3 font-medium transition ${
                    !isPositive
                      ? "bg-[var(--Red)] text-[var(--White)] border border-[var(--Red)]"
                      : "border border-[#E5E5E5] text-[var(--Gray)] hover:border-[var(--DarkGray)]"
                  }`}
                >
                  <DownvoteIcon size="l" className="mr-2" />
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

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                  Strengths
                </label>
                <textarea
                  required
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="Highlight the key strengths of this work"
                />
                <p className="text-xs text-[#8A8A8A] mt-1">{strengths.length} / 5000 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                  Weaknesses
                </label>
                <textarea
                  required
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="Describe weaknesses or areas to improve"
                />
                <p className="text-xs text-[#8A8A8A] mt-1">{weaknesses.length} / 5000 characters</p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--LightGray)] pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit review"}
                </Button>
                <Button type="button" variant="outline" onClick={() => window.close()}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-[var(--Gray)]">
                Please be constructive and specific.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
