"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginUser, requestPasswordReset } from "@/lib/api";
import { Button } from "@/components/Button";
import {
  CheckCircleSolidIcon,
  EyeIcon,
  EyeOffIcon,
  LoginIcon,
  UserIcon,
  XCircleSolidIcon,
} from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
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

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setIsResetSubmitting(true);

    try {
      const response = await requestPasswordReset(resetEmail.trim());
      setResetMessage(response.message || "Check your email for a reset link.");
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "Unable to request a password reset right now",
      );
    } finally {
      setIsResetSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--LightGray)] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-8 shadow-soft-md">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--DarkGray)] mb-6 mx-auto">
            <LoginIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="h1-apple text-[var(--DarkGray)] text-center mb-4">
            Welcome Back!
          </h1>
          <br/>

          {verified && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircleSolidIcon className="w-4 h-4 flex-shrink-0" />
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
                  <UserIcon className="w-4 h-4 text-[#8A8A8A]" />
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-[#8A8A8A] hover:text-[var(--DarkGray)] transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <XCircleSolidIcon className="w-4 h-4 flex-shrink-0" />
                  {"Wrong username or password."}
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

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-[var(--Gray)] hover:text-[var(--DarkGray)] transition-colors duration-200"
              onClick={() => {
                setShowReset((prev) => !prev);
                setResetMessage(null);
                setResetError(null);
              }}
            >
              Forgot password?
            </button>
          </div>

          {showReset && (
            <form onSubmit={handleResetSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                  Email
                </label>
                <input
                  id="resetEmail"
                  name="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] 
                    outline-none placeholder:text-[#9F9F9F] transition-all duration-200
                    focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              {resetError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="text-sm text-red-700">{resetError}</div>
                </div>
              )}

              {resetMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm text-emerald-700">{resetMessage}</div>
                </div>
              )}

              <Button
                type="submit"
                loading={isResetSubmitting}
                disabled={isResetSubmitting}
                className="w-full"
                variant="outline"
              >
                {isResetSubmitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

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
          {/* Back */}
          <div className="mt-4 text-center">
            <p className="text-sm text-[var(--Gray)]">
              Changed your mind?{" "}
              <Link
                href="/"
                className="link-apple font-medium"
              >
                Go back to the search page
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
