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
import PostActionsClient from "@/components/post-actions-client";

const ATTACHMENT_PREFIX = "/attachments/";
const ATTACHMENT_NAME_SEPARATOR = "__";

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
  storedFileName: string;
  displayName: string;
};

const getFileExtension = (fileName: string) => {
  const leaf = extractFileName(fileName) ?? fileName;
  const dotIndex = leaf.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex >= leaf.length - 1) return "";
  return leaf.slice(dotIndex);
};

const looksLikeGeneratedFileName = (fileName: string) => {
  const leaf = extractFileName(fileName) ?? fileName;
  const extension = getFileExtension(leaf);
  const base = extension ? leaf.slice(0, -extension.length) : leaf;
  const normalizedBase = base.toLowerCase();
  if (/^[0-9a-f]{32}$/.test(normalizedBase)) return true;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalizedBase,
    )
  ) {
    return true;
  }
  return false;
};

const deriveOriginalNameFromStoredFileName = (storedFileName: string) => {
  const leaf = extractFileName(storedFileName) ?? storedFileName;
  const extension = getFileExtension(leaf);
  const base = extension ? leaf.slice(0, -extension.length) : leaf;

  const separatorIndex = base.lastIndexOf(ATTACHMENT_NAME_SEPARATOR);
  if (separatorIndex <= 0) {
    return null;
  }

  const originalStem = base.slice(0, separatorIndex);
  const uniquePart = base.slice(separatorIndex + ATTACHMENT_NAME_SEPARATOR.length);
  if (!/^[0-9a-f]{32}$/i.test(uniquePart)) {
    return null;
  }

  return `${originalStem}${extension}`;
};

const normalizeDisplayName = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const leaf = extractFileName(trimmed);
  return leaf?.trim() || null;
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
      const storedFileName = filePath.split("/").pop() || filePath;
      const derived = deriveOriginalNameFromStoredFileName(storedFileName);
      const displayName =
        derived || normalizeDisplayName(storedFileName) || storedFileName;
      byPath.set(filePath, { filePath, storedFileName, displayName });
      return;
    }

    if (item && typeof item === "object") {
      const filePath = normalizeAttachmentPath(
        typeof (item as Record<string, unknown>).file_path === "string"
          ? ((item as Record<string, unknown>).file_path as string)
          : typeof (item as Record<string, unknown>).path === "string"
            ? ((item as Record<string, unknown>).path as string)
            : undefined,
      );
      if (!filePath) return;

      const storedFileName = filePath.split("/").pop() || filePath;
      const derived = deriveOriginalNameFromStoredFileName(storedFileName);
      const displayName =
        normalizeDisplayName(
          typeof (item as Record<string, unknown>).display_name === "string"
            ? ((item as Record<string, unknown>).display_name as string)
            : typeof (item as Record<string, unknown>).original_filename === "string"
              ? ((item as Record<string, unknown>).original_filename as string)
              : typeof (item as Record<string, unknown>).alt === "string"
                ? ((item as Record<string, unknown>).alt as string)
                : null,
        ) || storedFileName;

      const existing = byPath.get(filePath);
      if (existing) {
        if (existing.displayName === existing.storedFileName && displayName) {
          existing.displayName = displayName;
        }
        return;
      }

      byPath.set(filePath, {
        filePath,
        storedFileName,
        displayName: derived || displayName,
      });
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h1 className="h1-apple text-[var(--DarkGray)]">{post.title}</h1>
                <Button href="/" variant="primary" size="sm" className="shrink-0">
                  Back to browse
                </Button>
              </div>

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
                      {post.poster_role === "researcher" && (
                        <VerifiedResearcherBadge />
                      )}
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

                <div className="ml-auto flex flex-wrap items-start gap-2">
                  <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
                    <ReviewsButton postId={numericPostId} />
                    <PostReviewAction
                      postId={numericPostId}
                      posterId={post.poster_id}
                    />
                  </div>
                  <ReportButton postId={numericPostId} />
                  <PostActionsClient postId={numericPostId} posterId={post.poster_id} />
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3 pt-2">
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
              </div>

              <div className="flex justify-end border-t border-[var(--LightGray)] pt-3">
                <PostVoteActions
                  postId={numericPostId}
                  initialUpvotes={post.upvotes ?? 0}
                  initialDownvotes={post.downvotes ?? 0}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <div className="space-y-6">
                {post.authors_text ? (
                  <div>
                    <h2 className="mb-2 text-lg font-bold text-[var(--DarkGray)]">Authors:</h2>
                    <Katex
                      content={post.authors_text}
                      paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
                    />
                  </div>
                ) : null}
            </div>

            <div className="mt-6 space-y-6">
              {post.abstract ? (
                <div>
                  <h2 className="mb-2 text-lg font-bold text-[var(--DarkGray)]">Abstract:</h2>
                  <Katex
                    content={post.abstract}
                    paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 space-y-6">
              {post.body ? (
                <div>
                  <h2 className="mb-2 text-lg font-bold text-[var(--DarkGray)]">Body:</h2>
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
                  const trimmedDisplayName = attachment.displayName?.trim();
                  const extension = getFileExtension(attachment.storedFileName);
                  const displayName =
                    trimmedDisplayName &&
                    !looksLikeGeneratedFileName(trimmedDisplayName)
                      ? trimmedDisplayName
                      : `Attachment ${index + 1}${extension}`;
                  return (
                    <div
                      key={`${attachment.filePath}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 px-4 py-3 transition-colors duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--White)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--DarkGray)]">
                          {displayName}
                        </p>
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
