"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerUser } from "@/lib/api";
import { Button } from "@/components/Button";
import {
  CheckCircleSolidIcon,
  EyeIcon,
  EyeOffIcon,
  PlusIcon,
  XCircleSolidIcon,
} from "@/components/icons";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await registerUser({ username, email, password });
      setSuccess(
        "Please check your inbox for the verification email before signing in",
      );
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to register right now",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--LightGray)] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-[#E5E5E5] bg-[var(--White)] p-8 shadow-soft-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--DarkGray)] mb-6 mx-auto">
            <PlusIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="h1-apple text-[var(--DarkGray)] text-center mb-4">
            Join our Community!
          </h1>
          <br/>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none placeholder:text-[#9F9F9F] transition-all duration-200 focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="your-username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none placeholder:text-[#9F9F9F] transition-all duration-200 focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="your-email@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--DarkGray)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5E5E5] bg-[var(--White)] px-4 py-3 text-sm text-[var(--DarkGray)] outline-none placeholder:text-[#9F9F9F] transition-all duration-200 focus:border-[var(--DarkGray)] focus:ring-2 focus:ring-[rgba(55,55,55,0.15)] focus:ring-offset-2"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
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
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      password.length > 0 ? "bg-[#10B981]" : "bg-[#E5E5E5]"
                    }`}
                  ></div>
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      password.length > 4 ? "bg-[#10B981]" : "bg-[#E5E5E5]"
                    }`}
                  ></div>
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      password.length > 8 ? "bg-[#10B981]" : "bg-[#E5E5E5]"
                    }`}
                  ></div>
                </div>
                <p className="text-xs text-[#8A8A8A]">
                  Use at least 8 characters with letters and numbers
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <XCircleSolidIcon className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircleSolidIcon className="w-4 h-4 flex-shrink-0" />
                  {"Please check your inbox for the verification email before signing in."}
                </div>
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating your account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--Gray)]">
              Already have an account? {" "}
              <Link href="/login" className="link-apple font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-[var(--Gray)]">
              Changed your mind?{" "}
              <Link href="/" className="link-apple font-medium">
                Go to browse
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
