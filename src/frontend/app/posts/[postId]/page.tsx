import Link from "next/link";
import { notFound } from "next/navigation";
import { API_BASE_URL, getPostById, getPostComments } from "@/lib/api";
import CommentsSection from "@/components/comments-section";
import PostVoteActions from "@/components/post-vote-actions";
import ShareCitation from "@/components/share-citation";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
};

const renderParagraphs = (text: string) => {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) {
    return <p className="body-apple text-[var(--normal_text)]">{text}</p>;
  }
  return blocks.map((block, idx) => (
    <p key={`${block.slice(0, 16)}-${idx}`} className="body-apple leading-relaxed text-[var(--normal_text)]">
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
    <div className="min-h-screen bg-gradient-to-b from-[var(--page_background)] to-[var(--surface_muted)] px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-[var(--muted_text_soft)] hover:text-[var(--primary_accent)] transition-colors duration-200"
            >
              Home
            </Link>
            <span className="text-[var(--muted_text_soft)]">/</span>
            <span className="text-[var(--titles)] font-medium">Post</span>
          </div>
        </nav>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Post Header */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6 sm:p-8 shadow-soft-sm">
              <div className="mb-4">
                <Badge variant="accent" className="mb-4">
                  Research Showcase
                </Badge>
                <h1 className="h1-apple text-[var(--titles)] mb-4">
                  {post.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary_accent)] to-[var(--DarkRedLight)] flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {(post.authors_text || "A")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--titles)]">
                        {post.authors_text || "Anonymous"}
                      </p>
                      <p className="text-xs text-[var(--muted_text_soft)]">
                        Posted {new Date(post.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {post.tags?.length ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <Link
                      key={`${post.id}-${tag}`}
                      href={`/search?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface_muted)] hover:bg-[var(--surface_secondary)] transition-colors duration-200 group"
                    >
                      <span className="text-xs font-medium text-[var(--muted_text)] group-hover:text-[var(--primary_accent)]">
                        #{tag}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* Voting Actions */}
              <PostVoteActions
                postId={numericPostId}
                initialUpvotes={post.upvotes ?? 0}
                initialDownvotes={post.downvotes ?? 0}
              />
            </div>

            {/* Abstract */}
            {post.abstract && (
              <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 sm:p-8 shadow-soft-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-[var(--primary_accent)]"></div>
                  <h2 className="h3-apple text-[var(--titles)]">Abstract</h2>
                </div>
                <p className="body-apple text-[var(--normal_text)] leading-relaxed">
                  {post.abstract}
                </p>
              </div>
            )}

            {/* Main Content */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 sm:p-8 shadow-soft-sm">
              <article className="prose prose-sm sm:prose max-w-none space-y-4">
                {renderParagraphs(post.body)}
              </article>
            </div>

            {/* Attachments */}
            {post.attachments?.length ? (
              <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 sm:p-8 shadow-soft-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-2 w-2 rounded-full bg-[var(--primary_accent)]"></div>
                  <h2 className="h3-apple text-[var(--titles)]">Attachments</h2>
                </div>
                <div className="grid gap-3">
                  {post.attachments.map((filePath, index) => (
                    <div
                      key={`${filePath}-${index}`}
                      className="group flex items-center justify-between p-4 rounded-xl border border-[var(--border_on_surface_soft)] hover:border-[var(--primary_accent)] bg-[var(--surface_muted)] hover:bg-[var(--surface_primary)] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent">
                          <svg className="w-4 h-4 text-[var(--titles)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--titles)]">
                            Attachment {index + 1}
                          </p>
                          <p className="text-xs text-[var(--muted_text_soft)]">
                            {filePath.split('/').pop()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`${API_BASE_URL}${filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 text-sm font-medium text-[var(--primary_accent)] hover:text-[var(--titles)] transition-colors duration-200"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Share & Citation */}
            <ShareCitation postId={numericPostId} title={post.title} bibtex={post.bibtex} />

            {/* Comments */}
            <CommentsSection
              postId={numericPostId}
              initialComments={comments}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Back to Feed */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-b from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm">
              <Link
                href="/"
                className="group flex items-center gap-2 text-sm font-medium text-[var(--titles)] hover:text-[var(--primary_accent)] transition-colors duration-200"
              >
                <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Back to Feed
              </Link>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-b from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm">
              <h3 className="h3-apple mb-4 text-[var(--titles)]">Post Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Views</span>
                  <span className="text-sm font-medium text-[var(--titles)]">
                    {(post.upvotes || 0) + (post.downvotes || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Comments</span>
                  <span className="text-sm font-medium text-[var(--titles)]">
                    {comments.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted_text)]">Status</span>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700">
                    Published
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}