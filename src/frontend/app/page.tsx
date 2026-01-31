import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  type PostSummary,
  getLatestUsers,
  getPublishedPostCount,
  getUserCount,
  searchPosts,
} from "@/lib/api";
import ProfileButton from "@/components/profile-button";
import RouteRefreshPoller from "@/components/route-refresh-poller";
import {
  ChevronRightIcon,
  DownvoteIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UpvoteIcon,
  UserIcon,
} from "@/components/icons";

type LatestUser = {
  id: number;
  username: string;
  joined: string;
};

type HomeSearchParams = {
  query?: string;
  author?: string;
  tag?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

const PAGE_SIZE = 6;
const sortOptions = [
  { label: "Popular", value: "popular" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
] as const;

type QuickAction = {
  label: string;
  description: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const quickActions: QuickAction[] = [
  {
    label: "Create Post",
    description: "Share a new study with the portal.",
    href: "/posts/new",
    Icon: PlusIcon,
  },
  {
    label: "Browse Research",
    description: "Jump directly to the search filters.",
    href: "/",
    Icon: MagnifyingGlassIcon,
  },
  {
    label: "My Profile",
    description: "Review your contributions and stats.",
    href: "/me",
    Icon: UserIcon,
  },
];

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

const formatPoster = (post: PostSummary) => {
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

const PostCard = ({
  post,
  buildTagHref,
}: {
  post: PostSummary;
  buildTagHref?: (tag: string) => string;
}) => {
  const authorsText = post.authors_text?.trim();
  return (
    <article className="group rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm transition-all duration-300 hover:border-[var(--DarkGray)] hover:shadow-soft-md">
      <div className="space-y-4">
        <div className="space-y-3">
          <Link href={`/posts/${post.id}`}>
            <h3 className="text-xl font-semibold leading-tight text-[var(--DarkGray)] transition-colors duration-200 group-hover:text-[var(--Red)] line-clamp-2">
              {post.title}
            </h3>
          </Link>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--Gray)]">
            <div className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {post.poster_username ? (
                <Link
                  href={`/${encodeURIComponent(post.poster_username)}`}
                  className="text-sm font-medium text-[var(--DarkGray)] hover:text-[var(--Red)]"
                >
                  @{post.poster_username}
                </Link>
              ) : (
                <span className="text-sm text-[var(--Gray)]">
                  Researcher #{post.poster_id}
                </span>
              )}
            </div>
            <span className="text-[var(--GrayTransparent)]">/</span>
            <span className="text-xs uppercase tracking-wide text-[var(--Gray)]">
              {new Date(post.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {authorsText ? (
            <p className="text-sm text-[var(--Gray)]">
              <span className="text-xs tracking-wide text-[var(--Gray)]">Author(s):</span>{" "}
              <span className="font-medium text-[var(--DarkGray)]">{authorsText}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => {
              const href = buildTagHref
                ? buildTagHref(tag)
                : `/?tag=${encodeURIComponent(tag)}`;
              return (
                <Link
                  key={`${post.id}-${tag}`}
                  href={href}
                  className="inline-flex items-center rounded-full border border-[var(--LightGray)] px-3 py-1 text-xs font-medium text-[var(--DarkGray)] transition-colors duration-200 hover:border-[var(--DarkGray)]"
                >
                  #{tag}
                </Link>
              );
            })}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--Gray)] line-clamp-3">
          {getAbstractPreview(post.abstract)}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--LightGray)] pt-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-[var(--DarkGray)]">
              <UpvoteIcon />
              <span>{post.upvotes ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 text-[var(--DarkGray)]">
              <DownvoteIcon />
              <span>{post.downvotes ?? 0}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/posts/${post.id}`}
              className="inline-flex items-center gap-1 text-[var(--DarkGray)] transition-colors duration-200 hover:text-[var(--Red)]"
            >
              Read full post
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
            <span className="text-xs text-[var(--Gray)]">
              {new Date(post.created_at).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>;
}) {
  const resolved = ((await searchParams) ?? {}) as HomeSearchParams;
  const query = resolved.query?.trim() ?? "";
  const authorFilter = resolved.author?.trim() ?? "";
  const tagRaw = resolved.tag?.trim() ?? "";
  const tagFilters = tagRaw
    ? tagRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const from = resolved.from?.trim() ?? "";
  const to = resolved.to?.trim() ?? "";
  const sortParam = resolved.sort?.toLowerCase();
  const sortOption =
    sortParam === "popular" || sortParam === "newest" || sortParam === "oldest"
      ? sortParam
      : "popular";
  const requestedPage = Number.parseInt(resolved.page ?? "1", 10);
  let currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [searchResults, latestUsersRaw, totalUsers, totalPublishedPosts] = await Promise.all([
    searchPosts(query),
    getLatestUsers(),
    getUserCount(),
    getPublishedPostCount(),
  ]);

  const latestUsers = formatLatestUsers(latestUsersRaw);

  const filteredPosts = searchResults.filter((post) => {
    if (authorFilter) {
      const haystack = (post.authors_text || "").toLowerCase();
      if (!haystack.includes(authorFilter.toLowerCase())) {
        return false;
      }
    }

    if (tagFilters.length > 0) {
      const postTagsLower = (post.tags || []).map((t) => t.toLowerCase());
      const matchesAny = tagFilters.some((tf) => postTagsLower.includes(tf.toLowerCase()));
      if (!matchesAny) {
        return false;
      }
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate || toDate) {
      const createdAt = new Date(post.created_at);
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
    }

    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOption === "popular") {
      const aScore = (a.upvotes ?? 0) - (a.downvotes ?? 0);
      const bScore = (b.upvotes ?? 0) - (b.downvotes ?? 0);
      if (bScore === aScore) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return bScore - aScore;
    }

    if (sortOption === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedPosts = sortedPosts.slice(startIndex, startIndex + PAGE_SIZE);

  const hasAnyFilter =
    query.length > 0 ||
    authorFilter.length > 0 ||
    tagFilters.length > 0 ||
    from.length > 0 ||
    to.length > 0;

  const filterSummaries = [
    query && { label: "Search", value: query },
    authorFilter && { label: "Author", value: authorFilter },
    ...tagFilters.map((tag) => ({ label: "Tag", value: tag })),
    (from || to) && { label: "Date", value: `${from || "Any"} → ${to || "Any"}` },
  ].filter(Boolean) as { label: string; value: string }[];

  const communitySummary = [
    { label: "Registered Users", value: totalUsers.toLocaleString() },
    {
      label: "Published Posts",
      value: totalPublishedPosts.toLocaleString(),
    },
  ];

  const buildHref = (overrides?: Partial<Record<keyof HomeSearchParams, string | undefined>>) => {
    const params = new URLSearchParams();
    const append = (key: keyof HomeSearchParams, value?: string) => {
      if (value && value.length > 0) {
        params.set(key, value);
      }
    };

    append("query", query);
    append("author", authorFilter);
    if (tagFilters.length > 0) {
      params.set("tag", tagFilters.join(","));
    }
    append("from", from);
    append("to", to);
    if (sortOption !== "popular") {
      params.set("sort", sortOption);
    }
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }

    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        const typedKey = key as keyof HomeSearchParams;
        if (!value) {
          params.delete(typedKey);
        } else {
          params.set(typedKey, value);
        }
      }
    }

    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  };

  const buildPageHref = (page: number) =>
    buildHref({ page: page > 1 ? page.toString() : undefined });

  const buildSortHref = (value: string) =>
    buildHref({ sort: value === "popular" ? undefined : value, page: undefined });

  const buildTagHref = (tag: string) => {
    const normalized = [...tagFilters];
    const alreadyIncluded = normalized.some(
      (existing) => existing.toLowerCase() === tag.toLowerCase(),
    );
    if (!alreadyIncluded) {
      normalized.push(tag);
    }
    return buildHref({ tag: normalized.join(","), page: undefined });
  };

  const feedTitle = hasAnyFilter ? "Search Results" : "Feed";

  const pageList: Array<number | "ellipsis"> = (() => {
    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, "ellipsis", totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
  })();

  return (
    <div className="min-h-screen bg-[var(--LightGray)] px-4 py-10 sm:px-6 lg:px-8">
      <RouteRefreshPoller intervalMs={2000} />
      <div className="mx-auto max-w-7xl space-y-10">
        <section
          id="search-panel"
          className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-md sm:p-10"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="h1-apple text-[var(--DarkGray)]">
                Research Showcase Portal
              </h1>
              <p className="body-apple text-[var(--Gray)]">
                Discover, search, and discuss cutting-edge research with a focused community.
              </p>
            </div>
            <ProfileButton />
          </div>

          <form action="/" method="get" className="mt-6 space-y-6">
            <div className="relative">
              <label htmlFor="global-search" className="sr-only">
                Search research posts
              </label>
              <input
                id="global-search"
                name="query"
                defaultValue={query}
                placeholder="Search research posts by keywords..."
                className="w-full rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] py-3.5 pl-12 pr-4 text-sm text-[var(--DarkGray)] outline-none placeholder:text-[var(--Gray)] transition-colors duration-200 focus:border-[var(--DarkGray)]"
              />
              <div className="pointer-events-none absolute left-4 top-3.5 text-[var(--Gray)]">
                <MagnifyingGlassIcon className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  defaultValue={authorFilter}
                  placeholder="Search by author names..."
                  className="mt-2 w-full rounded-xl border border-[var(--LightGray)] bg-[var(--White)] px-3 py-2 text-sm text-[var(--DarkGray)] placeholder:text-[var(--Gray)] focus:border-[var(--DarkGray)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  name="tag"
                  defaultValue={tagFilters.join(", ")}
                  placeholder="e.g., #robotics, #computer_vision"
                  className="mt-2 w-full rounded-xl border border-[var(--LightGray)] bg-[var(--White)] px-3 py-2 text-sm text-[var(--DarkGray)] placeholder:text-[var(--Gray)] focus:border-[var(--DarkGray)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  From date
                </label>
                <input
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="mt-2 w-full rounded-xl border border-[var(--LightGray)] bg-[var(--White)] px-3 py-2 text-sm text-[var(--DarkGray)] focus:border-[var(--DarkGray)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
                  To date
                </label>
                <input
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="mt-2 w-full rounded-xl border border-[var(--LightGray)] bg-[var(--White)] px-3 py-2 text-sm text-[var(--DarkGray)] focus:border-[var(--DarkGray)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--LightGray)] pt-4">
              <button
                type="submit"
                className="rounded-full bg-[var(--DarkGray)] px-5 py-2 text-sm font-medium text-[var(--White)] transition-colors duration-200 hover:bg-[var(--Black)]"
              >
                Search posts
              </button>
              {hasAnyFilter ? (
                <Link
                  href="/"
                  className="text-sm font-medium text-[var(--Gray)] transition-colors duration-200 hover:text-[var(--Red)]"
                >
                  Clear filters
                </Link>
              ) : null
              }
            </div>
          </form>

          {filterSummaries.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--Gray)]">
              <span className="font-semibold text-[var(--DarkGray)]">Active filters:</span>
              {filterSummaries.map((filter) => (
                <span
                  key={`${filter.label}-${filter.value}`}
                  className="rounded-full border border-[var(--LightGray)] px-3 py-1 text-[var(--Gray)]"
                >
                  {filter.label}: {filter.value}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
          <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="h3-apple text-[var(--DarkGray)]">{feedTitle}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[var(--Gray)]">
                  Sort by:
                </span>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <Link
                      key={option.value}
                      href={buildSortHref(option.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                        sortOption === option.value
                          ? "border-[var(--DarkGray)] bg-[var(--DarkGray)] text-[var(--White)]"
                          : "border-[var(--LightGray)] text-[var(--DarkGray)] hover:border-[var(--DarkGray)]"
                      }`}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {paginatedPosts.length ? (
                paginatedPosts.map((post) => (
                  <PostCard key={`post-${post.id}`} post={post} buildTagHref={buildTagHref} />
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-8 text-center text-sm text-[var(--Gray)]">
                  {sortedPosts.length
                    ? "No posts match your filters on this page. Try a different page."
                    : "No posts were found."}
                </div>
              )}
            </div>

            {sortedPosts.length > 0 && (
              <div className="mt-8 border-t border-[var(--LightGray)] pt-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {currentPage === 1 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--LightGray)] text-[var(--Gray)]">
                      {"<"}
                    </span>
                  ) : (
                    <Link
                      href={buildPageHref(currentPage - 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--DarkGray)] text-[var(--DarkGray)] hover:bg-[var(--DarkGray)] hover:text-[var(--White)]"
                    >
                      {"<"}
                    </Link>
                  )}

                  {pageList.map((item, idx) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-[var(--Gray)]">
                        …
                      </span>
                    ) : item === currentPage ? (
                      <span
                        key={`page-${item}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--DarkGray)] text-xs font-semibold text-[var(--White)]"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={`page-${item}`}
                        href={buildPageHref(item)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--LightGray)] text-xs text-[var(--DarkGray)] hover:border-[var(--DarkGray)]"
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  {currentPage === totalPages ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--LightGray)] text-[var(--Gray)]">
                      {">"}
                    </span>
                  ) : (
                    <Link
                      href={buildPageHref(currentPage + 1)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--DarkGray)] text-[var(--DarkGray)] hover:bg-[var(--DarkGray)] hover:text-[var(--White)]"
                    >
                      {">"}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <div className="flex items-center justify-between">
                <h3 className="h3-apple text-[var(--DarkGray)]">Community</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--Red)]">
                  Live
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {communitySummary.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-gradient-to-br from-[var(--White)] to-[var(--LightGray)] border border-[var(--LightGray)] p-4 text-center"
                  >
                    <div className="text-2xl font-semibold text-[var(--DarkGray)]">{item.value}</div>
                    <p className="text-xs uppercase tracking-wide text-[var(--Gray)]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--DarkGray)]">
                    Newest members
                  </span>
                </div>
                <div className="space-y-2">
                  {latestUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] p-3 transition-colors duration-200 hover:border-[var(--DarkGray)]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--LightGray)] text-sm font-semibold text-[var(--DarkGray)]">
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/${user.username}`}
                          className="block text-sm font-medium text-[var(--DarkGray)] transition-colors duration-200 hover:text-[var(--Red)]"
                        >
                          @{user.username}
                        </Link>
                        <p className="text-xs text-[var(--Gray)]">Joined {user.joined}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-6 shadow-soft-sm">
              <h3 className="h3-apple text-[var(--DarkGray)]">Quick Actions</h3>
              <div className="mt-4 space-y-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group flex items-center justify-between rounded-2xl border border-[var(--LightGray)] bg-[var(--White)] px-4 py-3 shadow-soft-xs transition-all duration-200 hover:border-[var(--DarkGray)] hover:bg-[var(--LightGray)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)] transition-colors duration-200 group-hover:bg-[var(--DarkGray)] group-hover:text-[var(--White)]">
                        <action.Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--DarkGray)]">
                          {action.label}
                        </p>
                        <p className="text-xs text-[var(--Gray)]">{action.description}</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-[var(--Gray)] transition-colors duration-200 group-hover:text-[var(--DarkGray)]" />
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
