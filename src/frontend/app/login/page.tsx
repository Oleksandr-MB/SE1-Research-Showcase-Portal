"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginUser } from "@/lib/api";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verified = searchParams.get("verified");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const token = await loginUser(username, password);
      localStorage.setItem("rsp_token", token.access_token);
      const next = searchParams.get("next") || "/me";
      router.push(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to log you in right now",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5F5] via-[#F3F3F3] to-[var(--White)] px-4 py-8 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--DarkGray)] to-[var(--DarkRedLight)] mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="h1-apple text-[var(--DarkGray)] mb-2">
            Welcome Back
          </h1>
          <p className="body-apple text-[var(--Gray)]">
            Sign in to your research lab
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-gradient-to-br from-[var(--White)] to-transparent p-8 shadow-soft-md hover-lift">
          {verified && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 animate-scale-in">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your email is verified. You can sign in now.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="your-username"
                  autoComplete="username"
                  required
                />
                <div className="absolute right-3 top-3.5">
                  <svg className="w-4 h-4 text-[#8A8A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <div className="absolute right-3 top-3.5">
                  <svg className="w-4 h-4 text-[#8A8A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 animate-scale-in">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--Gray)]">
              Not registered yet?{" "}
              <Link
                href="/register"
                className="link-apple font-medium"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}