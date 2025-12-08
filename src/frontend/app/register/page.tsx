"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerUser } from "@/lib/api";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--page_background)] via-[var(--surface_muted)] to-[var(--surface_primary)] px-4 py-8 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary_accent)] to-[var(--DarkRedLight)] mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="h1-apple text-[var(--titles)] mb-2">
            Join Research Showcase
          </h1>
          <p className="body-apple text-[var(--muted_text)]">
            Start sharing and discovering research
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-8 shadow-soft-md hover-lift">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-username"
              required
              autoComplete="username"
              helperText="Choose a unique username for your profile"
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              required
              autoComplete="email"
              helperText="We'll send a verification link to this email"
            />

            <div>
              <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <div className="absolute right-3 top-3.5">
                  <svg className="w-4 h-4 text-[var(--muted_text_soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-1 flex-1 rounded-full ${password.length > 0 ? 'bg-[#10B981]' : 'bg-[var(--border_on_surface_soft)]'}`}></div>
                  <div className={`h-1 flex-1 rounded-full ${password.length > 4 ? 'bg-[#10B981]' : 'bg-[var(--border_on_surface_soft)]'}`}></div>
                  <div className={`h-1 flex-1 rounded-full ${password.length > 8 ? 'bg-[#10B981]' : 'bg-[var(--border_on_surface_soft)]'}`}></div>
                </div>
                <p className="text-xs text-[var(--muted_text_soft)]">
                  Use at least 8 characters with letters and numbers
                </p>
              </div>
            </div>

            {/* Messages */}
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

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 animate-scale-in">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {success}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating your account..." : "Create Account"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--muted_text)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="link-apple font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[var(--surface_muted)] to-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent">
              <svg className="w-4 h-4 text-[var(--primary_accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
              </svg>
            </div>
            <span className="text-xs font-medium text-[var(--titles)]">Share Research</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[var(--surface_muted)] to-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent">
              <svg className="w-4 h-4 text-[var(--primary_accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-[var(--titles)]">Join Community</span>
          </div>
        </div>
      </div>
    </div>
  );
}