import Link from "next/link";
import { getTopPosts, type PostSummary, getLatestUsers, getUserCount } from "@/lib/api";
import ProfileButton from "@/components/profile-button";

type LatestUser = {
  id: number;
  username: string;
  displayName?: string;
  joined: string;
};

const latestUsers: LatestUser[] = await getLatestUsers(5).then((users) =>
  users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.username.includes("_")
      ? user.username.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
      : undefined,
    joined: new Date(user.created_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  })));

const totalUsers: number = await getUserCount();

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
  if (sanitized.length <= 420) {
    return sanitized;
  }
  return `${sanitized.slice(0, 420)}...`;
};

const PostCard = ({ post }: { post: PostSummary }) => (
  <details className="group rounded-3xl border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6 shadow-soft-sm transition hover:-translate-y-0.5 hover:border-[var(--border_on_white)] hover:shadow-soft-md">
    <summary className="flex cursor-pointer items-start justify-between gap-6">
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-[var(--titles)]">
          {post.title}
        </h3>
        <p className="text-sm font-medium text-[var(--muted_text)]">
          by {formatAuthor(post)}
        </p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={`${post.id}-${tag}`}
              className="rounded-full border border-[var(--chip_border)] bg-[var(--chip_background)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--muted_text)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border_on_white)] text-lg font-semibold text-[var(--primary_accent)] transition group-open:rotate-45 group-open:border-[var(--primary_accent)] group-open:text-[var(--primary_accent)]">
        +
      </span>
    </summary>
    <div className="mt-5 border-t border-[var(--border_on_surface_soft)] pt-4 text-sm text-[var(--muted_text)]">
      <p>{getAbstractPreview(post.abstract)}</p>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-[var(--muted_text_soft)]">
        <div className="flex gap-4">
          <span className="font-semibold text-[var(--rating_text)]">
            👍 {post.upvotes ?? 0}
          </span>
          <span className="font-semibold text-[var(--rating_text)]">
            👎 {post.downvotes ?? 0}
          </span>
        </div>
        <Link
          href={`/posts/${post.id}`}
          className="white text-sm font-semibold text-[var(--primary_accent)] transition-colors"
        >
          View Full Post
        </Link>
      </div>
    </div>
  </details>
);

export default async function Home() {
  const posts = await getTopPosts();
  return (
    <div className="min-h-screen px-4 pb-16 pt-10 text-[var(--normal_text)] sm:px-8">
      <main className="shadow-soft-md mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-[40px] bg-[var(--surface_primary)] p-6 ring-1 ring-[var(--ring_on_surface)] sm:p-10">
        <header className="shadow-soft-sm flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-[var(--border_on_white)] bg-[var(--surface_primary)] p-4">
          <label
            htmlFor="global-search"
            className="shadow-soft-xs flex min-w-[260px] flex-1 items-center gap-3 rounded-full border border-[var(--surface_secondary)] bg-[var(--surface_primary)] px-5 py-3 text-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 text-[var(--primary_accent)]"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" strokeLinecap="round" />
            </svg>
            <input
              id="global-search"
              name="query"
              placeholder="Search research posts by titles, authors and tags..."
              className="h-full w-full border-none bg-transparent text-base text-[var(--normal_text)] outline-none placeholder:text-[var(--placeholder_text)]"
            />
          </label>
          <ProfileButton />
        </header>

        <section className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="shadow-soft-sm flex-1 space-y-4 rounded-[32px] border border-[var(--border_on_surface_soft)] bg-[var(--surface_primary)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-semibold text-[var(--titles)]">
                Hot posts right now:
              </h2>
            </div>
            <div className="grid gap-5">
              {posts.map((post) => (
                <PostCard key={`post-${post.id}`} post={post} />
              ))}
            </div>
          </div>
          <aside className="shadow-soft-sm w-full max-w-xs self-start rounded-[32px] bg-gradient-to-b from-[var(--Graphite)] to-[var(--Iron)] p-5 text-[var(--inverse_text)] lg:ml-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-lg font-bold text-[var(--inverse_text)]">
                  Latest Registrations
                </span>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {latestUsers.map((user) => (
                <li
                  key={user.username}
                  className="rounded-2xl bg-white/20 px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/${user.username}`}
                      className="white font-semibold text-[var(--inverse_text)] transition-colors"
                    >
                      {user.displayName
                      ? `@${user.username} (${user.displayName})`
                      : `@${user.username}`}
                    </Link>
                    <p className="text-[11px] text-white/70">
                      Joined {user.joined}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl text-center">
              <span className="text-lg font-bold text-[var(--inverse_text)]">
                {`Total users: ${totalUsers.toLocaleString()}`}
              </span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
