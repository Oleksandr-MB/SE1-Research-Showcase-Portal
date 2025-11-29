"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { registerUser } from "@/lib/api";

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
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface_muted)] px-4 text-[var(--normal_text)]">
      <div className="shadow-soft-md w-full max-w-md rounded-3xl border border-[var(--border_on_white)] bg-[var(--surface_primary)] p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary_accent)]">
            Join the portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--titles)]">
            Create your account
          </h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm font-medium text-[var(--muted_text)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-transparent px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[color:rgba(0,211,226,0.1)]"
              placeholder="your-username"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[var(--muted_text)]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-transparent px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[color:rgba(0,211,226,0.1)]"
              placeholder="user@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[var(--muted_text)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-transparent px-4 py-3 text-base text-[var(--normal_text)] outline-none focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[color:rgba(0,211,226,0.1)]"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-2xl bg-[var(--surface_muted)] px-4 py-3 text-sm text-[var(--primary_accent)]">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-2xl bg-[var(--primary_accent)] px-4 py-3 text-sm font-semibold text-[var(--inverse_text)] transition hover:bg-[var(--titles)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted_text)]">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--primary_accent)] hover:text-[var(--titles)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
