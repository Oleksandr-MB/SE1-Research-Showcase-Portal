import Link from "next/link";
import { getTopPosts, type PostSummary, getLatestUsers, getUserCount } from "@/lib/api";
import ProfileButton from "@/components/profile-button";
import { Badge } from "@/components/Badge";

type LatestUser = {
  id: number;
  username: string;
  joined: string;
};

const formatLatestUsers = (
  users: Awaited<ReturnType<typeof getLatestUsers>>,
): LatestUser[] =>
  users.map((user) => ({
    id: user.id,
    username: user.username,
    joined: new Date(user.created_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

const formatAuthor = (post: PostSummary) => {
  if (post.authors_text?.trim()) {
    return post.authors_text.trim();
  }
  if (post.poster_username) {
    return `@${post.poster_username}`;
  }
  return `Researcher #${post.poster_id}`;
};

const getAbstractPreview = (abstract?: string) => {
  if (!abstract) {
    return "No abstract was provided yet.";
  }
  const sanitized = abstract.trim();
  if (sanitized.length <= 320) {
    return sanitized;
  }
  return `${sanitized.slice(0, 317)}...`;
};

const PostCard = ({ post }: { post: PostSummary }) => (
  <div className="group rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm hover:shadow-soft-md hover-lift transition-all duration-300">
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <Link href={`/posts/${post.id}`}>
            <h3 className="text-xl font-semibold text-[var(--titles)] group-hover:text-[var(--primary_accent)] transition-colors duration-200 line-clamp-2">
              {post.title}
            </h3>
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-[var(--muted_text)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{formatAuthor(post)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link
                key={`${post.id}-${tag}`}
                href={`/search?tag=${encodeURIComponent(tag)}`}
                className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--surface_muted)] hover:bg-[var(--surface_secondary)] transition-colors duration-200 group/tag"
              >
                <span className="text-xs font-medium text-[var(--muted_text)] group-hover/tag:text-[var(--primary_accent)]">
                  #{tag}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-emerald-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>{post.upvotes ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-rose-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{post.downvotes ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border_on_surface_soft)] pt-4">
        <p className="text-sm text-[var(--muted_text)] leading-relaxed line-clamp-3">
          {getAbstractPreview(post.abstract)}
        </p>
        
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`/posts/${post.id}`}
            className="flex items-center gap-1 text-sm font-medium text-[var(--primary_accent)] hover:text-[var(--titles)] transition-colors duration-200"
          >
            Read full post
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          
          <div className="text-xs text-[var(--muted_text_soft)]">
            {new Date(post.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default async function Home() {
  const [posts, latestUsersRaw, totalUsers] = await Promise.all([
    getTopPosts(),
    getLatestUsers(),
    getUserCount(),
  ]);
  const latestUsers = formatLatestUsers(latestUsersRaw);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--page_background)] to-[var(--surface_muted)] px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="h1-apple text-[var(--titles)] mb-2">Research Showcase</h1>
              <p className="body-apple text-[var(--muted_text)]">
                Discover and share cutting-edge research with the community
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/search">
                <button className="px-4 py-2.5 text-sm font-medium rounded-full border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent text-[var(--titles)] hover:border-[var(--primary_accent)] hover:text-[var(--primary_accent)] transition-all duration-200">
                  Advanced Search
                </button>
              </Link>
              <ProfileButton />
            </div>
          </div>
          <div className="divider-subtle"></div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-8">
              <form action="/search" method="get" className="relative">
                <div className="relative">
                  <input
                    id="global-search"
                    name="query"
                    placeholder="Search research posts by titles, authors, tags..."
                    className="w-full rounded-2xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] pl-12 pr-4 py-3.5 text-sm text-[var(--normal_text)] 
                      outline-none placeholder:text-[var(--placeholder_text)] transition-all duration-200
                      focus:border-[var(--primary_accent)] focus:ring-2 focus:ring-[var(--ring_on_surface)] focus:ring-offset-2"
                  />
                  <div className="absolute left-4 top-3.5">
                    <svg className="w-5 h-5 text-[var(--muted_text_soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="absolute right-4 top-3.5">
                    <button
                      type="submit"
                      className="text-sm font-medium text-[var(--primary_accent)] hover:text-[var(--titles)] transition-colors duration-200"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Featured Posts */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="h3-apple text-[var(--titles)]">Featured Research</h2>
                  <p className="body-apple text-[var(--muted_text)] mt-1">
                    Top posts from the community
                  </p>
                </div>
                <Badge variant="accent">
                  {posts.length} Posts
                </Badge>
              </div>

              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={`post-${post.id}`} post={post} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-[var(--primary_accent)]"></div>
                <h3 className="h3-apple text-[var(--titles)]">Community</h3>
              </div>
              
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-[var(--surface_muted)] to-transparent">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[var(--titles)] mb-1">
                    {totalUsers.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--muted_text)]">
                    Total Researchers
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--titles)]">New Members</span>
                  <Badge variant="secondary">Latest</Badge>
                </div>
                
                <div className="space-y-3">
                  {latestUsers.map((user) => (
                    <div
                      key={user.username}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-[var(--border_on_surface_soft)] hover:border-[var(--primary_accent)] bg-[var(--surface_muted)] hover:bg-[var(--surface_primary)] transition-all duration-200"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--primary_accent)] to-[var(--DarkRedLight)] flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${user.username}`}
                          className="block text-sm font-medium text-[var(--titles)] truncate hover:text-[var(--primary_accent)] transition-colors duration-200"
                        >
                          @{user.username}
                        </Link>
                        <p className="text-xs text-[var(--muted_text_soft)] mt-0.5">
                          Joined {user.joined}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-[var(--border_on_surface_soft)] bg-gradient-to-br from-[var(--surface_primary)] to-transparent p-6 shadow-soft-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-[var(--primary_accent)]"></div>
                <h3 className="h3-apple text-[var(--titles)]">Quick Actions</h3>
              </div>
              
              <div className="space-y-3">
                <Link
                  href="/posts/new"
                  className="group flex items-center justify-between p-3 rounded-xl border border-[var(--border_on_surface_soft)] hover:border-[var(--primary_accent)] bg-[var(--surface_muted)] hover:bg-[var(--surface_primary)] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent">
                      <svg className="w-4 h-4 text-[var(--titles)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-[var(--titles)]">Create Post</span>
                  </div>
                  <svg className="w-4 h-4 text-[var(--muted_text_soft)] group-hover:text-[var(--primary_accent)] transition-colors" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                
                <Link
                  href="/search"
                  className="group flex items-center justify-between p-3 rounded-xl border border-[var(--border_on_surface_soft)] hover:border-[var(--primary_accent)] bg-[var(--surface_muted)] hover:bg-[var(--surface_primary)] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--surface_secondary)] to-transparent">
                      <svg className="w-4 h-4 text-[var(--titles)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-[var(--titles)]">Browse Research</span>
                  </div>
                  <svg className="w-4 h-4 text-[var(--muted_text_soft)] group-hover:text-[var(--primary_accent)] transition-colors" 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
