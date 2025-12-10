import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicUserProfile,
  getPublishedPostsByUsername,
  type PostRead,
} from "@/lib/api";
import SelfRedirector from "@/components/self-redirector";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

const summarize = (body: string, limit = 220) => {
  const trimmed = body.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}...`;
};

export default async function UserProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  const userProfile = await getPublicUserProfile(username).catch(() => notFound());
  const posts: PostRead[] = await getPublishedPostsByUsername(username).catch(() => []);

  const joinDate = new Date(userProfile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#F3F3F3] px-4 py-10 text-[var(--DarkGray)] sm:px-6">
      <SelfRedirector targetUsername={userProfile.username} />
      <main className="shadow-soft-md mx-auto max-w-7xl rounded-[32px] bg-[var(--White)] p-6 ring-1 ring-[rgba(55,55,55,0.15)] sm:p-10">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#E5E5E5] bg-[var(--White)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--DarkGray)]">
              Researcher profile
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[var(--DarkGray)]">
              {userProfile.username}
            </h1>
            <p className="text-sm text-[var(--Gray)]">
              Role: {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
            </p>
            <p className="text-xs text-[#8A8A8A]">Member since {joinDate}</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-[var(--DarkGray)] px-5 py-2 text-sm font-semibold text-[var(--DarkGray)] transition-colors hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
          >
            Back to explore
          </Link>
        </header>

        <section className="mt-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--DarkGray)]">
              Authored posts
            </h2>
            <span className="text-sm text-[var(--Gray)]">
              {posts.length} {posts.length === 1 ? "publication" : "publications"}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E5E5E5] bg-[#F3F3F3] px-6 py-10 text-center text-[var(--Gray)]">
              No published posts yet. Check back soon!
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-3xl border border-[#E5E5E5] bg-[var(--White)] p-5 shadow-soft-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-[var(--DarkGray)]">
                        {post.title}
                      </p>
                      <p className="text-xs text-[#8A8A8A]">
                        Published {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/posts/${post.id}`}
                      className="rounded-full bg-[var(--DarkGray)] px-4 py-2 text-sm font-semibold text-[var(--White)] transition-colors hover:bg-[var(--DarkGray)]"
                    >
                      View post
                    </Link>
                  </div>
                  <p className="mt-3 text-sm text-[var(--Gray)]">
                    {summarize(post.abstract || post.body)}
                  </p>
                  {post.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={`${post.id}-${tag}`}
                          href={`/search?tag=${encodeURIComponent(tag)}`}
                          className="rounded-full border border-[#E5E5E5] bg-[#F3F3F3] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--Gray)] hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
