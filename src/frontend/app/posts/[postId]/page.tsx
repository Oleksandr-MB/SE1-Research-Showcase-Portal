import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById, getPostComments } from "@/lib/api";
import CommentsSection from "@/components/comments-section";
import PostVoteActions from "@/components/post-vote-actions";
import PostReviewAction from "@/components/post-review-action";
import ReviewsButton from "@/components/reviews-button";
import ShareCitation from "@/components/share-citation";
import Katex from "@/components/katex";
import AttachmentDownloadButton from "@/components/attachment-download-button";
import { Button } from "@/components/Button";
import VerifiedResearcherBadge from "@/components/verified-researcher-badge";
import ReportButton from "@/components/report-button";
import PostPdfDownloadButton from "@/components/post-pdf-download-button";
import PostActionsClient from "@/components/post-actions-client";
import type { PostAttachmentRead } from "@/lib/api";

const ATTACHMENT_PREFIX = "/attachments/";

const extractFileName = (value: string): string | null => {
  const normalized = value.replace(/\\/g, "/").trim();
  if (!normalized) {
    return null;
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const leaf = segments[segments.length - 1];
  const [withoutQuery] = leaf.split(/[?#]/);
  return withoutQuery || null;
};

const normalizeAttachmentPath = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(ATTACHMENT_PREFIX)) {
    return trimmed;
  }

  let candidatePath = trimmed;
  try {
    const parsed = new URL(trimmed);
    candidatePath = parsed.pathname || trimmed;
  } catch {
    // ignore invalid URLs
  }

  const normalizedCandidate = candidatePath.replace(/\\/g, "/");
  const lowerCandidate = normalizedCandidate.toLowerCase();
  const markerIndex = lowerCandidate.lastIndexOf(ATTACHMENT_PREFIX);
  if (markerIndex !== -1) {
    const afterMarker = normalizedCandidate.slice(
      markerIndex + ATTACHMENT_PREFIX.length,
    );
    const fromMarker = extractFileName(afterMarker);
    if (fromMarker) {
      return `${ATTACHMENT_PREFIX}${fromMarker}`;
    }
  }

  const fileName = extractFileName(normalizedCandidate);
  if (fileName) {
    const sanitized = fileName.replace(/^attachments\//i, "");
    return `${ATTACHMENT_PREFIX}${sanitized}`;
  }

  return null;
};

type NormalizedAttachment = {
  filePath: string;
  fileName: string;
  alt?: string | null;
};

const normalizeAttachments = (raw: unknown): NormalizedAttachment[] => {
  if (!raw) {
    return [];
  }

  const rawList: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.values(raw as Record<string, unknown>)
      : [];

  const byPath = new Map<string, NormalizedAttachment>();

  rawList.forEach((item) => {
    if (typeof item === "string") {
      const filePath = normalizeAttachmentPath(item);
      if (!filePath) return;
      const fileName = filePath.split("/").pop() || filePath;
      byPath.set(filePath, { filePath, fileName });
      return;
    }

    if (item && typeof item === "object") {
      const typed = item as PostAttachmentRead;
      const filePath = normalizeAttachmentPath(
        typeof typed.file_path === "string"
          ? typed.file_path
          : typeof typed.path === "string"
            ? typed.path
            : undefined,
      );
      if (!filePath) return;

      const fileName = filePath.split("/").pop() || filePath;
      const altRaw =
        typeof typed.alt === "string"
          ? typed.alt
          : typeof typed.display_name === "string"
            ? typed.display_name
            : typeof typed.original_filename === "string"
              ? typed.original_filename
              : null;
      const alt = altRaw?.trim() || null;

      const existing = byPath.get(filePath);
      if (existing) {
        if (!existing.alt && alt) {
          existing.alt = alt;
        }
        return;
      }

      byPath.set(filePath, { filePath, fileName, alt });
    }
  });

  return Array.from(byPath.values());
};

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostDetailsPage({ params }: PageProps) {
  const { postId } = await params;
  const numericPostId = Number(postId);

  if (Number.isNaN(numericPostId)) {
    notFound();
  }

  const post = await getPostById(numericPostId).catch(() => notFound());
  const comments = await getPostComments(numericPostId).catch(() => []);

  const attachmentItems = normalizeAttachments(post.attachments);
  const attachmentPaths = attachmentItems.map((item) => item.filePath);

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4">
            <h1 className="h1-apple text-[var(--DarkGray)]">{post.title}</h1>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                    {(post.poster_username || "A")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--DarkGray)]">
                        {post.poster_username ? (
                          <Link
                            href={`/${encodeURIComponent(post.poster_username)}`}
                            className="hover:text-[var(--Red)]"
                          >
                            @{post.poster_username}
                          </Link>
                        ) : (
                          <>Researcher #{post.poster_id}</>
                        )}
                      </p>
                      {post.poster_role === "researcher" && <VerifiedResearcherBadge />}
                    </div>
                    <p className="text-xs text-[var(--Gray)]">
                      Published{" "}
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <PostPdfDownloadButton
                    title={post.title}
                    authorsText={post.authors_text}
                    abstract={post.abstract}
                    body={post.body}
                    attachments={attachmentPaths}
                  />
                  <PostActionsClient postId={numericPostId} posterId={post.poster_id} />
                  <ReportButton postId={numericPostId} />
                  <PostReviewAction postId={numericPostId} posterId={post.poster_id} />
                  <PostVoteActions
                    postId={numericPostId}
                    initialUpvotes={post.upvotes ?? 0}
                    initialDownvotes={post.downvotes ?? 0}
                  />
                  <ReviewsButton postId={numericPostId} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {post.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={`${post.id}-${tag}`}
                      href={`/?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center rounded-full border border-[var(--LightGray)] px-3 py-1 text-xs font-medium text-[var(--Gray)] transition-colors duration-200 hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              ) : null}
              <Button href="/" variant="primary" size="md" className="ml-auto">
                Back to browse
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
          <div className="space-y-6">
            {post.authors_text ? (
              <Katex
                content={post.authors_text}
                paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
              />
            ) : null}

            {post.abstract ? (
              <div className="border-t border-[var(--LightGray)] pt-6">
                <Katex
                  content={post.abstract}
                  paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
                />
              </div>
            ) : null}

            {post.body ? (
              <div className="border-t border-[var(--LightGray)] pt-6">
                <Katex
                  content={post.body}
                  attachments={attachmentPaths}
                  paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
                />
              </div>
            ) : null}
          </div>
        </section>

        {attachmentItems.length > 0 ? (
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="h3-apple text-[var(--DarkGray)]">Attachments</h3>
              </div>
              <span className="text-xs text-[var(--Gray)]">
                {attachmentItems.length} file{attachmentItems.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {attachmentItems.map((attachment, index) => {
                const displayName = attachment.alt?.trim() || attachment.fileName;
                const subLabel =
                  displayName !== attachment.fileName ? attachment.fileName : `Attachment ${index + 1}`;
                return (
                  <div
                    key={`${attachment.filePath}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 px-4 py-3 transition-colors duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--White)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--DarkGray)]">{displayName}</p>
                      <p className="text-xs text-[var(--Gray)]">{subLabel}</p>
                    </div>
                    <AttachmentDownloadButton
                      filePath={attachment.filePath}
                      fileName={displayName}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <CommentsSection postId={numericPostId} initialComments={comments} />

        <ShareCitation postId={numericPostId} title={post.title} authors={post.authors_text} bibtex={post.bibtex} />

      </div>
    </div>
  );
}
