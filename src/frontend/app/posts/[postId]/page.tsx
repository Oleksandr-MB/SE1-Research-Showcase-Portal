import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE_URL, getPostById, getPostComments } from "@/lib/api";
import CommentsSection from "@/components/comments-section";
import PostVoteActions from "@/components/post-vote-actions";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
};

const renderParagraphs = (text: string) => {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) {
    return <p className="text-[var(--normal_text)]">{text}</p>;
  }
  return blocks.map((block, idx) => (
    <p key={`${block.slice(0, 16)}-${idx}`} className="leading-relaxed text-[var(--normal_text)]">
      {block}
    </p>
  ));
};

export default async function PostDetailsPage({ params }: PageProps) {
  const { postId } = await params;
  const numericPostId = Number(postId);

  if (Number.isNaN(numericPostId)) {
    notFound();
  }

  const post = await getPostById(numericPostId).catch(() => notFound());
  const comments = await getPostComments(numericPostId).catch(() => []);

  return (
    <div className="min-h-screen bg-[var(--surface_muted)] px-4 py-10 text-[var(--normal_text)] sm:px-6">
      <main className="shadow-soft-md mx-auto max-w-4xl space-y-10 rounded-[32px] bg-[var(--surface_primary)] p-6 ring-1 ring-[var(--ring_on_surface)] sm:p-10">
        <header className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-[var(--primary_accent)] transition-colors hover:text-[var(--titles)]"
          >
            Back to feed
          </Link>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary_accent)]">
              Research showcase
            </p>
            <h1 className="text-4xl font-semibold text-[var(--titles)]">
              {post.title}
            </h1>
            <div className="text-sm text-[var(--muted_text)]">
              {post.authors_text} · Posted on{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </div>
            {post.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={`${post.id}-${tag}`}
                    className="rounded-full border border-[var(--chip_border)] bg-[var(--chip_background)] px-3 py-1 text-xs uppercase tracking-wide text-[var(--muted_text)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </header>
        <PostVoteActions
          postId={numericPostId}
          initialUpvotes={post.upvotes ?? 0}
          initialDownvotes={post.downvotes ?? 0}
        />

        <section className="space-y-6">
          {post.abstract && (
            <div className="rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_muted)] px-5 py-4 text-[var(--muted_text)]">
              <p className="text-sm uppercase tracking-wide text-[var(--muted_text_soft)]">
                Abstract
              </p>
              <p className="mt-2 text-base">{post.abstract}</p>
            </div>
          )}

          <article className="space-y-4 text-base leading-relaxed text-[var(--normal_text)]">
            {renderParagraphs(post.body)}
          </article>

          {post.attachments?.length ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--muted_text_soft)]">
                Attachments
              </p>
              <ul className="space-y-2">
                {post.attachments.map((filePath, index) => (
                  <li
                    key={`${filePath}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-3 text-sm"
                  >
                    <span className="text-[var(--titles)]">
                      Attachment {index + 1}
                    </span>
                    <a
                      href={`${API_BASE_URL}${filePath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--primary_accent)] px-4 py-2 text-xs font-semibold text-[var(--primary_accent)] transition-colors hover:border-[var(--titles)] hover:text-[var(--titles)]"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <CommentsSection
          postId={numericPostId}
          initialComments={comments}
        />
      </main>
    </div>
  );
}
