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

const summarize = (body: string | undefined, limit = 220) => {
  if (!body) return "";
  const trimmed = body.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit - 3)}...`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default async function UserProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams.username);

  const userProfile = await getPublicUserProfile(username).catch(() => null);
  if (!userProfile) {
    notFound();
  }

  const posts: PostRead[] = await getPublishedPostsByUsername(username).catch(
    () => [],
  );

  const displayName = userProfile.display_name || userProfile.username;
  const joinDate = formatDate(userProfile.created_at);

  const isVerified = userProfile.is_institution_verified === true;
  const isResearcher = userProfile.role === "researcher";
  const isModerator = userProfile.role === "moderator";

  const showOrcid =
    !!userProfile.orcid && userProfile.is_orcid_public !== false;
  const showArxiv =
    !!userProfile.arxiv && userProfile.is_arxiv_public !== false;
  const showSocials = userProfile.is_socials_public !== false;

  return (
    <div className="min-h-screen bg-[var(--White)] px-4 pb-24 pt-12 text-[var(--DarkGray)] sm:px-6 lg:px-8">
      {/* If the logged-in user visits their own public page, send them to /me */}
      {/*<SelfRedirector targetUsername={userProfile.username} />*/}

      <main className="shadow-soft-md mx-auto max-w-7xl rounded-[32px] border border-[var(--LightGray)] bg-[var(--White)] p-6 ring-1 ring-[rgba(55,55,55,0.15)] sm:p-10">
        {/* Header */}
        <header className="flex flex-col gap-6 rounded-[28px] border border-[var(--LightGray)] bg-[#FAFAFA] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--LightGray)] text-xl font-semibold text-[var(--DarkGray)]">
              {(displayName || "R")[0].toUpperCase()}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                Researcher profile
              </p>
              <h1 className="text-2xl font-semibold text-[var(--DarkGray)] sm:text-3xl">
                {displayName}
              </h1>
              <p className="text-sm text-[var(--Gray)]">@{userProfile.username}</p>

              {userProfile.affiliation && (
                <p className="text-sm text-[var(--DarkGray)]">
                  {userProfile.affiliation}
                </p>
              )}

              <p className="text-xs text-[#8A8A8A]">Member since {joinDate}</p>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-[#F2F2F2] px-3 py-1 font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  {isModerator
                    ? "Moderator"
                    : isResearcher
                    ? "Researcher"
                    : "Registered user"}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--RedTransparent)] px-3 py-1 text-[var(--Red)]">
                    ✅ <span className="font-medium">Verified affiliation</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--LightGray)] px-4 py-2 text-xs font-semibold text-[var(--DarkGray)] transition-colors hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
            >
              ← Back to search
            </Link>
          </div>
        </header>

        {/* Bio + identifiers + links */}
        <section className="mt-6 grid gap-8 border-b border-[var(--LightGray)] pb-8 sm:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--Gray)]">
              About
            </h2>
            {userProfile.bio ? (
              <p className="text-sm leading-relaxed text-[var(--DarkGray)]">
                {userProfile.bio}
              </p>
            ) : (
              <p className="text-sm text-[var(--Gray)]">
                This researcher hasn&apos;t added a bio yet.
              </p>
            )}

            <div className="mt-4 space-y-3 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                Identifiers
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-4">
                  <span className="text-[var(--Gray)]">ORCID</span>
                  {showOrcid ? (
                    <a
                      href={
                        userProfile.orcid!.startsWith("http")
                          ? userProfile.orcid!
                          : `https://orcid.org/${userProfile.orcid}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.orcid}
                    </a>
                  ) : (
                    <span className="text-[var(--Gray)]">Not shared</span>
                  )}
                </li>
                <li className="flex items-center justify-between gap-4">
                  <span className="text-[var(--Gray)]">arXiv</span>
                  {showArxiv ? (
                    <a
                      href={
                        userProfile.arxiv!.startsWith("http")
                          ? userProfile.arxiv!
                          : `https://arxiv.org/a/${userProfile.arxiv}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.arxiv}
                    </a>
                  ) : (
                    <span className="text-[var(--Gray)]">Not shared</span>
                  )}
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--Gray)]">
              Links
            </h2>
            {showSocials ? (
              <ul className="space-y-2 text-sm">
                {userProfile.website && (
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-[var(--Gray)]">Website</span>
                    <a
                      href={userProfile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.website}
                    </a>
                  </li>
                )}
                {userProfile.github && (
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-[var(--Gray)]">GitHub</span>
                    <a
                      href={userProfile.github}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.github}
                    </a>
                  </li>
                )}
                {userProfile.linkedin && (
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-[var(--Gray)]">LinkedIn</span>
                    <a
                      href={userProfile.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.linkedin}
                    </a>
                  </li>
                )}
                {userProfile.twitter && (
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-[var(--Gray)]">Twitter / X</span>
                    <a
                      href={
                        userProfile.twitter.startsWith("http")
                          ? userProfile.twitter
                          : `https://twitter.com/${userProfile.twitter.replace(
                              /^@/,
                              "",
                            )}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[var(--Red)] hover:underline"
                    >
                      {userProfile.twitter}
                    </a>
                  </li>
                )}
                {!userProfile.website &&
                  !userProfile.github &&
                  !userProfile.linkedin &&
                  !userProfile.twitter && (
                    <li className="text-sm text-[var(--Gray)]">
                      No links shared.
                    </li>
                  )}
              </ul>
            ) : (
              <p className="text-sm text-[var(--Gray)]">
                This user doesn&apos;t share their social links publicly.
              </p>
            )}
          </div>
        </section>

        {/* Research posts = history of posts */}
        <section className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--DarkGray)]">
              Research posts
            </h2>
            <span className="text-xs text-[var(--Gray)]">
              {posts.length} published
            </span>
          </div>

          {posts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--LightGray)] bg-[#FAFAFA] px-4 py-6 text-sm text-[var(--Gray)]">
              No posts yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <article className="group rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-5 shadow-soft-sm transition-shadow duration-200 hover:shadow-soft-md">
                    <header className="space-y-1">
                      <Link href={`/posts/${post.id}`}>
                        <h3 className="text-base font-semibold text-[var(--DarkGray)] group-hover:text-[var(--Red)]">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-[var(--Gray)]">
                        {post.authors_text}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--Gray)]">
                        Published {formatDate(post.created_at)}
                      </p>
                    </header>

                    {post.abstract && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--DarkGray)]">
                        {summarize(post.abstract, 260)}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap gap-2">
                        {post.tags?.length ? (
                          post.tags.map((tag) => (
                            <Link
                              key={`${post.id}-${tag}`}
                              href={`/search?tag=${encodeURIComponent(tag)}`}
                              className="rounded-full border border-[var(--LightGray)] bg-[#FAFAFA] px-3 py-1 font-medium uppercase tracking-wide text-[var(--Gray)] hover:border-[var(--Red)] hover:text-[var(--Red)]"
                            >
                              #{tag}
                            </Link>
                          ))
                        ) : (
                          <span className="rounded-full bg-[#FAFAFA] px-3 py-1 text-[var(--Gray)]">
                            No tags
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[var(--Gray)]">
                        <span className="rounded-full bg-[#FAFAFA] px-2.5 py-1 font-medium">
                          ▲ {post.upvotes ?? 0}
                        </span>
                        <span className="rounded-full bg-[#FAFAFA] px-2.5 py-1 font-medium">
                          ▼ {post.downvotes ?? 0}
                        </span>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}