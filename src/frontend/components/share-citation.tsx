"use client";

import { useEffect, useState } from "react";

type ShareCitationProps = {
  postId: number;
  title: string;
  bibtex?: string | null;
};

type CopiedVariant = "url" | "bibtex" | null;

export default function ShareCitation({
  postId,
  title,
  bibtex,
}: ShareCitationProps) {
  const [shareUrl, setShareUrl] = useState<string>(`/posts/${postId}`);
  const [copied, setCopied] = useState<CopiedVariant>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setShareUrl(`${window.location.origin}/posts/${postId}`);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [postId]);

  const handleCopy = async (text: string, variant: CopiedVariant) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(variant);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {

    }
  };

  const resolvedBibtex =
    (bibtex && bibtex.trim()) ||
    [
      `@misc{post_${postId},`,
      `  title        = {${title}},`,
      `  howpublished = {\\url{${shareUrl}}},`,
      `  note         = {Research Showcase Portal},`,
      `}`,
    ].join("\n");

  return (
    <section className="mt-8 space-y-4 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F7] p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8A8A8A]">
          Share &amp; Cite
        </h2>
        {copied && (
          <p
            className="text-xs font-medium text-[var(--DarkGray)]"
            aria-live="polite"
          >
            {copied === "url" ? "Link copied!" : "BibTeX copied!"}
          </p>
        )}
      </header>

      {/* Share link */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
          Permanent Link
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-2xl bg-[var(--White)] px-3 py-2 text-xs text-[var(--DarkGray)]">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={() => handleCopy(shareUrl, "url")}
            className="mt-1 inline-flex items-center justify-center rounded-2xl bg-[var(--DarkGray)] px-4 py-2 text-xs font-semibold text-white shadow-soft-xs transition hover:bg-[var(--Black)] sm:mt-0"
          >
            Copy link
          </button>
        </div>
      </div>

      {/* BibTeX citation */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8A8A]">
          BibTeX
        </p>
        <div className="rounded-2xl bg-[var(--White)] p-3">
          <pre className="max-h-60 overflow-auto text-xs leading-relaxed text-[var(--DarkGray)]">
{resolvedBibtex}
          </pre>
        </div>
        <button
          type="button"
          onClick={() => handleCopy(resolvedBibtex, "bibtex")}
          className="inline-flex items-center justify-center rounded-2xl bg-[#F7F7F7] px-3 py-2 text-xs font-semibold text-[var(--DarkGray)] ring-1 ring-[rgba(55,55,55,0.08)] hover:bg-[rgba(55,55,55,0.08)]"
        >
          Copy BibTeX
        </button>
      </div>
    </section>
  );
}
