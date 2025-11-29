const API_BASE_URL = "http://localhost:8000";

export type PostSummary = {
  id: number;
  title: string;
  abstract: string;
  authors_text: string;
  poster_username?: string;
  tags: string[];
  poster_id: number;
  created_at: string;
  upvotes?: number;
  downvotes?: number;
};

export type UserRole = "user" | "researcher" | "moderator";

export type UserRead = {
  id: number;
  username: string;
  role: UserRole;
  email: string;
  created_at: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
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

  const response = await fetch(sanitizedPath, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API request failed (${response.status}): ${errorBody || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

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

export async function getUserByUsername(
  token: string,
  username: string,
): Promise<UserRead> {
  return fetchFromApi<UserRead>(`/users/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

export async function getTopPosts(n = 5): Promise<PostSummary[]> {
  try {
    const posts = await fetchFromApi<PostSummary[]>(`/posts/top?n=${n}`);
    return posts;
  } catch (error) {
    console.warn("Failed to fetch top posts:", error);
    return [];
  }
}

export async function getLatestUsers(n = 10): Promise<UserRead[]> {
  try {
    const users = await fetchFromApi<UserRead[]>(`/users/latest?n=${n}`);
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
