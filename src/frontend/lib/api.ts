export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type PostPhase = "published";

export type PostSummary = {
  id: number;
  title: string;
  abstract: string;
  authors_text: string;
  poster_username: string;
  poster_display_name?: string | null;
  poster_role: string;
  tags: string[];
  poster_id: number;
  created_at: string;
  upvotes?: number;
  downvotes?: number;
  phase: PostPhase;
};

export type PostRead = PostSummary & {
  body: string;
  attachments: string[];
  bibtex?: string | null;
  upvotes: number;
  downvotes: number;
};

export type AttachmentDescriptor = {
  file_path: string;
  mime_type?: string;
};

export type AttachmentUploadResponse = {
  file_path: string;
  mime_type: string;
  original_filename: string;
  file_size: number;             
};


export type CreatePostPayload = {
  title: string;
  abstract: string;
  authors_text: string;
  body: string;
  bibtex?: string;
  tags?: string[];
  attachments?: string[];
};

export type CommentThread = {
  id: number;
  post_id: number;
  commenter_id: number;
  commenter_username: string;
  parent_comment_id: number | null;
  body: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

export type CommentActivity = {
  id: number;
  post_id: number;
  post_title: string;
  body: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

export type CreateCommentPayload = {
  body: string;
  parent_comment_id?: number;
};

export type VoteResponse = {
  upvotes: number;
  downvotes: number;
};

export type ReviewCreate = {
  body: string;
  is_positive: boolean;
  strengths: string;
  weaknesses: string;
};

export type ReviewRead = {
  id: number;
  post_id: number;
  reviewer_id: number;
  reviewer_username: string;
  body: string;
  is_positive: boolean;
  strengths?: string | null;
  weaknesses?: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
};

export type UserRole = "user" | "researcher" | "moderator";

export type UserRead = {
  id: number;
  username: string;
  role: UserRole;
  email: string;
  created_at: string;

  display_name?: string | null;
  bio?: string | null;
  affiliation?: string | null;
  orcid?: string | null;
  arxiv?: string | null;
  website?: string | null;
  twitter?: string | null;
  github?: string | null;
  linkedin?: string | null;

  is_profile_public?: boolean;
  is_orcid_public?: boolean;
  is_socials_public?: boolean;
  is_arxiv_public?: boolean;
  is_email_public?: boolean;

  is_institution_verified?: boolean;
};

export type PublicUserRead = Omit<UserRead, "email"> & {
  email?: string | null;
  is_email_public?: boolean;
};

export type ProfileUpdatePayload = {
  display_name?: string;
  bio?: string;
  affiliation?: string;
  orcid?: string;
  arxiv?: string;
  website?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  is_profile_public?: boolean;
  is_orcid_public?: boolean;
  is_socials_public?: boolean;
  is_arxiv_public?: boolean;
  is_email_public?: boolean;
};


export type ReportRead = {
  reports: Report[]
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type ApiMessage = {
  message: string;
};

async function fetchFromApi<T>(path: string, init?: RequestInit): Promise<T> {
  const sanitizedPath = path.startsWith("http")
    ? path
    : `${API_BASE_URL}/${path.replace(/^\//, "")}`;

  let response: Response;
  try {
    response = await fetch(sanitizedPath, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new Error(
      `Network error while contacting API (${sanitizedPath}): ${message}`,
    );
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();
    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawBody) as unknown;
        if (
          parsed &&
          typeof parsed === "object" &&
          "detail" in parsed &&
          typeof (parsed as { detail?: unknown }).detail === "string"
        ) {
          throw new Error((parsed as { detail: string }).detail);
        }
        if (
          parsed &&
          typeof parsed === "object" &&
          "message" in parsed &&
          typeof (parsed as { message?: unknown }).message === "string"
        ) {
          throw new Error((parsed as { message: string }).message);
        }
      } catch {
        // Fall through to raw body below.
      }
    }
    throw new Error(
      rawBody || `API request failed (${response.status}): ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};


export async function registerUser(
  payload: RegisterPayload,
): Promise<UserRead> {
  return fetchFromApi<UserRead>("/users/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.set("username", username);
  formData.set("password", password);
  formData.set("scope", "");
  formData.set("client_id", "");
  formData.set("client_secret", "");

  return fetchFromApi<TokenResponse>("/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });
}

export async function getCurrentUser(token: string): Promise<UserRead> {
  return fetchFromApi<UserRead>("/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getMyRecentComments(
  token: string,
  n = 5,
): Promise<CommentActivity[]> {
  return fetchFromApi<CommentActivity[]>(
    `/users/me/comments?n=${encodeURIComponent(String(n))}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function getUserByUsername(
  token: string,
  username: string,
): Promise<PublicUserRead> {
  return fetchFromApi<PublicUserRead>(`/users/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateProfile(
  token: string,
  payload: ProfileUpdatePayload,
): Promise<UserRead> {
  return fetchFromApi<UserRead>("/users/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(token: string): Promise<void> {
  const sanitizedPath = `${API_BASE_URL}/users/logout`;
  const response = await fetch(sanitizedPath, {
    cache: "no-store",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 401) {
    const errorBody = await response.text();
    throw new Error(
      `API request failed (${response.status}): ${errorBody || response.statusText}`,
    );
  }
}

export async function verifyEmailToken(token: string): Promise<ApiMessage> {
  return fetchFromApi<ApiMessage>(`/users/verify-email?token=${encodeURIComponent(token)}`);
}

export async function requestPasswordReset(email: string): Promise<ApiMessage> {
  return fetchFromApi<ApiMessage>("/users/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ApiMessage> {
  return fetchFromApi<ApiMessage>("/users/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export async function getTopPosts(n = 5): Promise<PostSummary[]> {
  try {
    const posts = await fetchFromApi<PostSummary[]>(`/posts/top?n=${n}`);
    return posts;
  } catch (error) {
    console.warn("Failed to fetch top posts:", error);
    return [];
  }
}

export async function createPost(
  token: string,
  payload: CreatePostPayload,
): Promise<PostRead> {
  return fetchFromApi<PostRead>("/posts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(payload),
  });
}

export async function getLatestUsers(n = 5): Promise<PublicUserRead[]> {
  try {
    const users = await fetchFromApi<PublicUserRead[]>(`/users/latest?n=${n}`);
    return users;
  } catch (error) {
    console.warn("Failed to fetch latest users:", error);
    return [];
  }
}

export async function getUserCount(): Promise<number> {
  try {
    const count = await fetchFromApi<number>(`/users/count`);
    return count;
  } catch (error) {
    console.warn("Failed to fetch user count:", error);
    return 0;
  }
}

export async function getPublishedPostCount(): Promise<number> {
  try {
    const count = await fetchFromApi<number>(`/posts/count`);
    return count;
  } catch (error) {
    console.warn("Failed to fetch published post count:", error);
    return 0;
  }
}

export async function getPublicUserProfile(
  username: string,
): Promise<PublicUserRead> {
  return fetchFromApi<PublicUserRead>(`/users/${encodeURIComponent(username)}`);
}

export async function getPublishedPostsByUsername(
  username: string,
): Promise<PostRead[]> {
  return fetchFromApi<PostRead[]>(`/posts/by/${encodeURIComponent(username)}`);
}

export async function getPostById(postId: number): Promise<PostRead> {
  return fetchFromApi<PostRead>(`/posts/${postId}`);
}

export async function getPostComments(postId: number): Promise<CommentThread[]> {
  return fetchFromApi<CommentThread[]>(`/posts/${postId}/comments`);
}

export async function createComment(
  token: string,
  postId: number,
  payload: CreateCommentPayload,
): Promise<CommentThread> {
  return fetchFromApi<CommentThread>(`/posts/${postId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function voteOnPost(
  token: string,
  postId: number,
  value: -1 | 0 | 1,
): Promise<VoteResponse> {
  return fetchFromApi<VoteResponse>(`/posts/${postId}/vote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
}

export async function voteOnComment(
  token: string,
  postId: number,
  commentId: number,
  value: -1 | 0 | 1,
): Promise<VoteResponse> {
  return fetchFromApi<VoteResponse>(`/posts/${postId}/comments/${commentId}/vote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
}

export async function uploadPostAttachment(
  token: string,
  file: File,
): Promise<AttachmentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint = `${API_BASE_URL}/posts/attachments/upload`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Attachment upload failed (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  return response.json() as Promise<AttachmentUploadResponse>;
}

export async function searchPosts(query?: string): Promise<PostRead[]> {
  const trimmed = query?.trim();
  const path = trimmed && trimmed.length > 0
    ? `/posts?query=${encodeURIComponent(trimmed)}`
    : "/posts";

  return fetchFromApi<PostRead[]>(path);
}

export async function createReview(
  token: string,
  postId: number,
  payload: ReviewCreate,
): Promise<ReviewRead> {
  return fetchFromApi<ReviewRead>(`/posts/${postId}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function getPostReviews(postId: number): Promise<ReviewRead[]> {
  return fetchFromApi<ReviewRead[]>(`/posts/${postId}/reviews`);
}

export async function getReviewById(reviewId: number): Promise<ReviewRead> {
  return fetchFromApi<ReviewRead>(`/reviews/${reviewId}`);
}

export async function voteOnReview(
  token: string,
  reviewId: number,
  value: 1 | -1,
): Promise<ReviewRead> {
  return fetchFromApi<ReviewRead>(`/reviews/${reviewId}/vote`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
}


export async function promoteUser(
    token: string,
    username: string,
    role: string,

): Promise<UserRole> {

  return fetchFromApi<UserRole>(`/users/${username}/promote_user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ role }),
  });
}



export async function getPostReports(
  // post_id: number,
): Promise<ReportRead> {
  return fetchFromApi<ReportRead>( `/posts/{post_id}/reports`);
}