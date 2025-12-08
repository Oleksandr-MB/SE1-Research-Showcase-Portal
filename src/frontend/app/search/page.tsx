import Link from "next/link";
import { searchPosts, type PostRead } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";

type SearchPageProps = {
  searchParams: Promise<{
    query?: string;
    author?: string;
    tag?: string;
    from?: string;
    to?: string;
  }>;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolved = await searchParams;

  const query = resolved.query?.trim() ?? "";
  const authorFilter = resolved.author?.trim() ?? "";
  const tagRaw = resolved.tag?.trim() ?? "";
  const tagFilters =
    tagRaw.length > 0
      ? tagRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
  const from = resolved.from?.trim() ?? "";
  const to = resolved.to?.trim() ?? "";

  const hasAnyFilter =
    query.length > 0 ||
    authorFilter.length > 0 ||
    tagFilters.length > 0 ||
    from.length > 0 ||
    to.length > 0;

  // Fetch from backend using the text query
  const posts: PostRead[] = await searchPosts(query);

  // Client-side filters
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const filtered = posts.filter((post) => {
    // Author filter
    if (authorFilter) {
      const haystack = (post.authors_text || "").toLowerCase();
      if (!haystack.includes(authorFilter.toLowerCase())) return false;
    }

    // Tag filter
    if (tagFilters.length > 0) {
      const postTagsLower = (post.tags || []).map((t) => t.toLowerCase());
      const matchesAny = tagFilters.some((tf) =>
        postTagsLower.includes(tf.toLowerCase()),
      );
      if (!matchesAny) return false;
    }

    // Date range filter
    if (fromDate || toDate) {
      const createdAt = new Date(post.created_at);
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
    }

    return true;
  });

  // Sort by recency
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const resultsCount = sorted.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--page_background)] to-[var(--surface_muted)] px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="h1-apple text-[var(--titles)] mb-2">Discover Research</h1>
              <p className="body-apple text-[var(--muted_text)]">
                Search and filter through the latest research publications
              </p>
            </div>
            <Link href="/posts/new">
              <Button variant="primary" size="md">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Post
              </Button>
            </Link>
          </div>
          <div className="divider-subtle"></div>
        </div>

        {/* Search Card */}
        <div className="mb-8 rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 shadow-soft-md">
          <form method="get" className="space-y-6">
            {/* Main Search */}
            <div>
              <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="query"
                  defaultValue={query}
                  placeholder="Search titles, abstracts, authors, or tags..."
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] pl-12 pr-4 py-3.5 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                />
                <div className="absolute left-4 top-3.5">
                  <svg className="w-5 h-5 text-[var(--muted_text_soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  defaultValue={authorFilter}
                  placeholder="Search by author..."
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-2.5 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                  Tag
                </label>
                <input
                  type="text"
                  name="tag"
                  defaultValue={tagFilters}
                  placeholder="e.g., quantum, ML"
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-2.5 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-2.5 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--titles)] mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] px-4 py-2.5 text-sm text-[var(--normal_text)] 
                    outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                    focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border_on_surface_soft)]">
              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary">
                  Apply Filters
                </Button>
                {hasAnyFilter && (
                  <Link href="/search">
                    <Button type="button" variant="ghost">
                      Clear All
                    </Button>
                  </Link>
                )}
              </div>
              {hasAnyFilter && (
                <div className="text-sm text-[var(--muted_text)]">
                  <span className="font-medium text-[var(--titles)]">{resultsCount}</span> results found
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Active Filters */}
        {hasAnyFilter && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[var(--muted_text)]">Active filters:</span>
            {query && (
              <Badge variant="secondary">
                Search: {query}
                <Link href={`/search?${new URLSearchParams({
                  ...resolved,
                  query: ''
                })}`} className="ml-1.5">
                  ×
                </Link>
              </Badge>
            )}
            {authorFilter && (
              <Badge variant="secondary">
                Author: {authorFilter}
                <Link href={`/search?${new URLSearchParams({
                  ...resolved,
                  author: ''
                })}`} className="ml-1.5">
                  ×
                </Link>
              </Badge>
            )}
            {tagFilters.map((tag) => (
              <Badge variant="secondary" key={tag}>
                Tag: {tag}
                <Link href={`/search?${new URLSearchParams({
                  ...resolved,
                  tag: tagFilters.filter(t => t !== tag).join(',')
                })}`} className="ml-1.5">
                  ×
                </Link>
              </Badge>
            ))}
            {(from || to) && (
              <Badge variant="secondary">
                Date: {from || 'Any'} to {to || 'Any'}
                <Link href={`/search?${new URLSearchParams({
                  ...resolved,
                  from: '',
                  to: ''
                })}`} className="ml-1.5">
                  ×
                </Link>
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="h3-apple text-[var(--titles)]">
                {hasAnyFilter ? "Search Results" : "Latest Research"}
              </h2>
              <p className="body-apple text-[var(--muted_text)]">
                {hasAnyFilter
                  ? `Found ${resultsCount} matching post${resultsCount !== 1 ? 's' : ''}`
                  : `Showing ${resultsCount} post${resultsCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted_text)]">Sort:</span>
              <select className="text-sm bg-transparent border-0 focus:ring-0 text-[var(--titles)] outline-none">
                <option>Newest first</option>
                <option>Most popular</option>
                <option>Oldest first</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--surface_muted)] to-transparent flex items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--muted_text_soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="h3-apple text-[var(--titles)] mb-2">No results found</h3>
                <p className="body-apple text-[var(--muted_text)] mb-6">
                  Try adjusting your search filters or browse all posts
                </p>
                <Link href="/search">
                  <Button variant="outline">View All Posts</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {sorted.map((post) => (
                <div
                  key={post.id}
                  className="group rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm hover:shadow-soft-md hover-lift transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Link href={`/posts/${post.id}`}>
                        <h3 className="text-lg font-semibold text-[var(--titles)] group-hover:text-[var(--primary_accent)] transition-colors duration-200 line-clamp-2 mb-2">
                          {post.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-[var(--muted_text)]">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate max-w-[200px]">{post.authors_text}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{getTimeAgo(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-sm text-[var(--muted_text)]">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span>{post.upvotes ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-[var(--muted_text)]">
                        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span>{post.downvotes ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {post.abstract && (
                    <p className="text-sm text-[var(--muted_text)] mb-4 line-clamp-3 leading-relaxed">
                      {post.abstract}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {post.tags?.slice(0, 3).map((tag) => (
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
                      {post.tags && post.tags.length > 3 && (
                        <span className="text-xs text-[var(--muted_text_soft)]">
                          +{post.tags.length - 3} more
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/posts/${post.id}`}
                      className="flex items-center gap-1 text-sm font-medium text-[var(--primary_accent)] hover:text-[var(--titles)] transition-colors duration-200"
                    >
                      Read more
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More (Optional) */}
          {sorted.length > 0 && (
            <div className="pt-8 text-center">
              <Button variant="outline" disabled>
                Load more posts
              </Button>
              <p className="text-xs text-[var(--muted_text_soft)] mt-2">
                Showing {Math.min(sorted.length, 12)} of {sorted.length} posts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}