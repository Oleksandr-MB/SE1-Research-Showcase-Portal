import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById, getPostComments } from "@/lib/api";
import CommentsSection from "@/components/comments-section";
import PostVoteActions from "@/components/post-vote-actions";
import ShareCitation from "@/components/share-citation";
import MathContent from "@/components/math-content";
import AttachmentDownloadButton from "@/components/attachment-download-button";
import { Button } from "@/components/Button";

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
    // Not a full URL, continue with the original value
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

const normalizeAttachments = (raw: unknown): string[] => {
  if (!raw) {
    return [];
  }

  const rawList: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object"
      ? Object.values(raw as Record<string, unknown>)
      : [];

  const normalized = rawList
    .map((item) => {
      if (typeof item === "string") {
        return normalizeAttachmentPath(item);
      }
      if (item && typeof item === "object") {
        const maybeFilePath =
          typeof (item as { file_path?: unknown }).file_path === "string"
            ? (item as { file_path?: string }).file_path
            : typeof (item as { path?: unknown }).path === "string"
              ? (item as { path?: string }).path
              : undefined;
        return normalizeAttachmentPath(maybeFilePath);
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
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

  const attachments = normalizeAttachments(post.attachments);

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-4">
            <h1 className="h1-apple text-[var(--DarkGray)]">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-lg font-semibold text-[var(--DarkGray)]">
                  {(post.poster_username || "A")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--DarkGray)]">
                    @{post.poster_username ?? `Researcher #${post.poster_id}`}
                  </p>
                  <p className="text-xs text-[var(--Gray)]">
                    Published {new Date(post.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="ml-auto">
                <PostVoteActions
                  postId={numericPostId}
                  initialUpvotes={post.upvotes ?? 0}
                  initialDownvotes={post.downvotes ?? 0}
                />
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
                Return to the main page
              </Button>
            </div>
          </div>
        </section>

        {post.authors_text ? (
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--LightGray)] pb-4">
              <div>
                <h2 className="h3-apple text-[var(--DarkGray)]">Authors</h2>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <p className="body-apple leading-relaxed text-[var(--DarkGray)]">
                {post.authors_text}
              </p>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--LightGray)] pb-4">
            <div>
              <h2 className="h3-apple text-[var(--DarkGray)]">Abstract & Body</h2>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {post.abstract ? (
              <MathContent
                content={post.abstract}
                paragraphClassName="body-apple text-[var(--DarkGray)] leading-relaxed"
                className="space-y-3"
              />
            ) : null}
            <hr className="border-t border-[var(--LightGray)]" />
            {post.body ? (
              <MathContent
                content={post.body}
                className="space-y-3"
                paragraphClassName="body-apple leading-relaxed text-[var(--DarkGray)]"
              />
            ) : null}
          </div>
        </section>

        <ShareCitation postId={numericPostId} title={post.title} bibtex={post.bibtex} />

        <CommentsSection postId={numericPostId} initialComments={comments} />

        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
          <Button href="/" variant="secondary" size="md" className="w-full justify-center">
            Back to Feed
          </Button>
        </section>

        {attachments.length > 0 ? (
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="h3-apple text-[var(--DarkGray)]">Attachments</h3>
              </div>
              <span className="text-xs text-[var(--Gray)]">
                {attachments.length} file{attachments.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {attachments.map((filePath, index) => {
                const fileName = filePath.split("/").pop() || `Attachment-${index + 1}`;
                return (
                  <div
                    key={`${filePath}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--LightGray)]/40 px-4 py-3 transition-colors duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--White)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--DarkGray)]">{fileName}</p>
                      <p className="text-xs text-[var(--Gray)]">Attachment {index + 1}</p>
                    </div>
                    <AttachmentDownloadButton
                      filePath={filePath}
                      fileName={fileName}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
