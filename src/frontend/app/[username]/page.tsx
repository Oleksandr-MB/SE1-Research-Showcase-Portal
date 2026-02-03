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
import PromoteUserButton from "@/components/promote-user-button";

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

  const showEmail =
    userProfile.is_email_public === true && Boolean(userProfile.email);

  const normalizeProfileValue = (value: string | null | undefined) =>
    (value ?? "").trim();

  const bio = normalizeProfileValue(userProfile.bio);
  const affiliation = normalizeProfileValue(userProfile.affiliation);
  const orcid = normalizeProfileValue(userProfile.orcid);
  const arxiv = normalizeProfileValue(userProfile.arxiv);
  const website = normalizeProfileValue(userProfile.website);
  const github = normalizeProfileValue(userProfile.github);
  const linkedin = normalizeProfileValue(userProfile.linkedin);
  const twitter = normalizeProfileValue(userProfile.twitter);

  const identifierItems = [
    orcid
      ? {
          label: "ORCID",
          href: orcid.startsWith("http") ? orcid : `https://orcid.org/${orcid}`,
          text: orcid,
        }
      : null,
    arxiv
      ? {
          label: "arXiv",
          href: arxiv.startsWith("http") ? arxiv : `https://arxiv.org/a/${arxiv}`,
          text: arxiv,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; text: string }>;

  const linkItems = [
    website
      ? {
          label: "Website",
          href: normalizeUrl(website),
          text: website,
        }
      : null,
    github
      ? {
          label: "GitHub",
          href: normalizeUrl(github),
          text: github,
        }
      : null,
    linkedin
      ? {
          label: "LinkedIn",
          href: normalizeUrl(linkedin),
          text: linkedin,
        }
      : null,
    twitter
      ? {
          label: "Twitter / X",
          href: twitter.startsWith("http")
            ? twitter
            : `https://twitter.com/${twitter.replace(/^@/, "")}`,
          text: twitter,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; text: string }>;

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

                {affiliation ? (
                  <p className="text-sm text-[var(--DarkGray)]">{affiliation}</p>
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
                            Read full post
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
              {bio ? (
                <p className="mt-3 text-sm leading-relaxed text-[var(--DarkGray)]">
                  {bio}
                </p>
              ) : null}
              <PromoteUserButton
                targetUsername={userProfile.username}
                currentRole={userProfile.role}
              />

              <div className="mt-5 space-y-3 text-sm">
                {affiliation ? (
                  <div className="flex items-center justify-between gap-4 border-b border-[var(--LightGray)] pb-3">
                    <span className="text-[var(--Gray)]">Affiliation</span>
                    <span className="truncate text-[var(--DarkGray)]">
                      {affiliation}
                    </span>
                  </div>
                ) : null}
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

            {identifierItems.length > 0 ? (
              <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
                <h2 className="h3-apple text-[var(--DarkGray)]">Identifiers</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {identifierItems.map((item, index) => (
                    <li
                      key={item.label}
                      className={`flex items-center justify-between gap-4 ${
                        index < identifierItems.length - 1
                          ? "border-b border-[var(--LightGray)] pb-3"
                          : ""
                      }`}
                    >
                      <span className="text-[var(--Gray)]">{item.label}</span>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--Red)] hover:underline"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {linkItems.length > 0 ? (
              <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
                <h2 className="h3-apple text-[var(--DarkGray)]">Links</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {linkItems.map((item, index) => (
                    <li
                      key={item.label}
                      className={`flex items-center justify-between gap-4 ${
                        index < linkItems.length - 1
                          ? "border-b border-[var(--LightGray)] pb-3"
                          : ""
                      }`}
                    >
                      <span className="text-[var(--Gray)]">{item.label}</span>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-[var(--Red)] hover:underline"
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
