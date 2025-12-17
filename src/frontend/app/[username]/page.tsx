import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicUserProfile,
  getPublishedPostsByUsername,
  type PostRead,
} from "@/lib/api";
import SelfRedirector from "@/components/self-redirector";
import VerifiedResearcherBadge from "@/components/verified-researcher-badge";
import { Button } from "@/components/Button";
import { DownvoteIcon, UpvoteIcon } from "@/components/icons/vote";

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

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

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

  const isResearcher = userProfile.role === "researcher";
  const isModerator = userProfile.role === "moderator";
  const isVerified = userProfile.is_institution_verified === true;

  const showEmail = userProfile.is_email_public === true && Boolean(userProfile.email);
  const showOrcid = Boolean(userProfile.orcid) && userProfile.is_orcid_public !== false;
  const showArxiv = Boolean(userProfile.arxiv) && userProfile.is_arxiv_public !== false;
  const showSocials = userProfile.is_socials_public !== false;

  const roleLabel = isModerator ? "Moderator" : isResearcher ? "Researcher" : "User";

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 text-[var(--DarkGray)] sm:px-6 lg:px-8 animate-fade-in">
      <SelfRedirector targetUsername={userProfile.username} />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--LightGray)] text-xl font-semibold text-[var(--DarkGray)]">
                {(displayName || "R")[0].toUpperCase()}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  Public profile
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="h1-apple text-[var(--DarkGray)]">{displayName}</h1>
                  {isResearcher && <VerifiedResearcherBadge />}
                </div>
                <p className="text-sm text-[var(--Gray)]">@{userProfile.username}</p>

                {userProfile.affiliation ? (
                  <p className="text-sm text-[var(--DarkGray)]">{userProfile.affiliation}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--Gray)]">
                  <span className="rounded-full bg-[#FAFAFA] px-3 py-1">
                    Member since {joinDate}
                  </span>
	                  <span className="rounded-full bg-[#FAFAFA] px-3 py-1">
	                    {roleLabel}
	                  </span>
                  {isVerified ? (
                    <span className="rounded-full bg-[var(--RedTransparent)] px-3 py-1 text-[var(--Red)]">
                      Verified affiliation
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button href="/" variant="primary">
                Back to browse
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="h3-apple text-[var(--DarkGray)]">Research posts</h2>
              <span className="text-xs text-[var(--Gray)]">{posts.length} published</span>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--LightGray)] bg-[#FAFAFA] px-4 py-6 text-sm text-[var(--Gray)]">
                No posts yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {posts.map((post) => (
                  <li key={post.id}>
                    <article className="group rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-5 shadow-soft-sm transition-shadow duration-200 hover:shadow-soft-md">
                      <header className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <Link href={`/posts/${post.id}`}>
                              <h3 className="text-base font-semibold text-[var(--DarkGray)] group-hover:text-[var(--Red)]">
                                {post.title}
                              </h3>
                            </Link>
                            <p className="text-[11px] uppercase tracking-wide text-[var(--Gray)]">
                              Published {formatDate(post.created_at)}
                            </p>
                          </div>
                          <Link
                            href={`/posts/${post.id}`}
                            className="shrink-0 text-xs font-medium text-[var(--DarkGray)] hover:text-[var(--Red)]"
                          >
                            Read →
                          </Link>
                        </div>
                      </header>

                      {post.abstract ? (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--DarkGray)]">
                          {summarize(post.abstract, 260)}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--Gray)]">
                          No abstract provided.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--LightGray)] pt-4 text-xs">
                        <div className="flex flex-wrap gap-2">
                          {post.tags?.length ? (
                            post.tags.map((tag) => (
                              <Link
                                key={`${post.id}-${tag}`}
                                href={`/?tag=${encodeURIComponent(tag)}`}
                                className="rounded-full border border-[var(--LightGray)] bg-[#FAFAFA] px-3 py-1 font-medium text-[var(--DarkGray)] transition-colors duration-200 hover:border-[var(--DarkGray)]"
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

                        <div className="flex shrink-0 items-center gap-2 text-[var(--Gray)]">
                          <UpvoteIcon size='s' className="h-4 w-4" /> {post.upvotes ?? 0}
                          <DownvoteIcon size='s' className="h-4 w-4" /> {post.downvotes ?? 0}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h2 className="h3-apple text-[var(--DarkGray)]">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--DarkGray)]">
                {userProfile.bio || "This user hasn’t written a bio yet."}
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
                  <span className="text-[var(--Gray)]">Affiliation</span>
                  <span className="truncate text-[var(--DarkGray)]">
                    {userProfile.affiliation || "Not provided"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--Gray)]">Email</span>
                  {showEmail ? (
                    <span className="truncate text-[var(--DarkGray)]">{userProfile.email}</span>
                  ) : (
                    <span className="text-[var(--Gray)]">Hidden</span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h2 className="h3-apple text-[var(--DarkGray)]">Identifiers</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
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
            </section>

            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h2 className="h3-apple text-[var(--DarkGray)]">Links</h2>
              {showSocials ? (
                <ul className="mt-4 space-y-3 text-sm">
                  {userProfile.website ? (
                    <li className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
                      <span className="text-[var(--Gray)]">Website</span>
                      <a
                        href={normalizeUrl(userProfile.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--Red)] hover:underline"
                      >
                        {userProfile.website}
                      </a>
                    </li>
                  ) : null}
                  {userProfile.github ? (
                    <li className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
                      <span className="text-[var(--Gray)]">GitHub</span>
                      <a
                        href={normalizeUrl(userProfile.github)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--Red)] hover:underline"
                      >
                        {userProfile.github}
                      </a>
                    </li>
                  ) : null}
                  {userProfile.linkedin ? (
                    <li className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
                      <span className="text-[var(--Gray)]">LinkedIn</span>
                      <a
                        href={normalizeUrl(userProfile.linkedin)}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--Red)] hover:underline"
                      >
                        {userProfile.linkedin}
                      </a>
                    </li>
                  ) : null}
                  {userProfile.twitter ? (
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
                  ) : null}

                  {!userProfile.website &&
                  !userProfile.github &&
                  !userProfile.linkedin &&
                  !userProfile.twitter ? (
                    <li className="text-sm text-[var(--Gray)]">No links shared.</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--Gray)]">
                  This user doesn&apos;t share their social links publicly.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
