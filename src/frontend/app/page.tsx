import Link from "next/link";
import { getTopPosts, type PostSummary } from "@/lib/api";
import ProfileButton from "@/components/profile-button";

type LatestUser = {
  id: number;
  username: string;
  displayName?: string;
  joined: string;
};

const latestUsers: LatestUser[] = [
  {
    id: 1,
    username: "never",
    displayName: "Dr. Alexei Shevtsov",
    joined: "0 minutes ago",
  },
  {
    id: 2,
    username: "gonna",
    displayName: "AlexDarkstalker98",
    joined: "1 minutes ago",
  },
  {
    id: 3,
    username: "give",
    displayName: "Glad Valakas",
    joined: "4 minutes ago",
  },
  {
    id: 4,
    username: "you",
    displayName: "Dr. Anton Chigurh",
    joined: "8 minutes ago",
  },
  {
    id: 5,
    username: "up",
    displayName: "Oxxxymiron",
    joined: "8 minutes ago",
  },
];

const totalResearchers = 69420;

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
  return `${sanitized.slice(0, 420)}…`;
};

const PostCard = ({ post }: { post: PostSummary }) => (
  <details className="group rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <summary className="flex cursor-pointer items-start justify-between gap-6">
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-slate-900">{post.title}</h3>
        <p className="text-sm font-medium text-slate-500">
          by {formatAuthor(post)}
        </p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={`${post.id}-${tag}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-500 transition group-open:rotate-45 group-open:border-indigo-300 group-open:text-indigo-500">
        +
      </span>
    </summary>
    <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
      <p>{getAbstractPreview(post.abstract)}</p>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
        <div className="flex gap-3">
          <span>👍 {post.upvotes ?? 0}</span>
          <span>👎 {post.downvotes ?? 0}</span>
        </div>
        <Link
          href={`/posts/${post.id}`}
          className="text-indigo-600 transition hover:text-indigo-500"
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
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-10 text-slate-900 sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <label
            htmlFor="global-search"
            className="flex flex-1 items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 text-slate-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" strokeLinecap="round" />
            </svg>
            <input
              id="global-search"
              name="query"
              placeholder="Search research posts by titles, authors and tags..."
              className="h-full w-full border-none bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <ProfileButton />
        </header>

        <section className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4 rounded-[32px] border border-slate-100 bg-white/60 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">
                🔥 Hot Posts Right Now
              </h2>
            </div>
            <div className="grid gap-5">
              {posts.map((post) => (
                <PostCard key={`post-${post.id}`} post={post} />
              ))}
            </div>
          </div>
          <aside className="w-full max-w-xs self-start rounded-[28px] bg-gradient-to-b from-[#1a0023] via-[#310040] to-[#47005f] p-5 text-white shadow-lg lg:ml-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-large font-bold text-white ">
                  Latest Registrations
                </span>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {latestUsers.map((user) => (
                <li
                  key={user.username}
                  className="rounded-2xl bg-white/10 px-4 py-3"
                >
                  <div>
                    <Link
                      href={`/users/${user.username}`}
                      className="font-semibold text-white transition hover:text-white/80"
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
              <span className="text-large font-bold text-white">
                {`Total researchers: ${totalResearchers.toLocaleString()}`}
              </span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
