"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { resetPassword } from "@/lib/api";
import { Button } from "@/components/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message || "Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--LightGray)] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-8 shadow-soft-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--DarkGray)] mb-6 mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="h1-apple text-[var(--DarkGray)] text-center mb-2">
            Reset your password
          </h1>
          <p className="text-sm text-[var(--Gray)] text-center mb-6">
            Choose a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                  outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                  focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                  outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                  focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm text-emerald-700">{message}</div>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/login" className="link-apple text-sm font-medium">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

