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

// Mock data for design showcase

const mockTopPosts: PostSummary[] = [
  {
    id: 1,
    title: "Collaborative Robotics for Disaster Response",
    abstract:
      "A swarm-robotics approach that coordinates heterogeneous drones and rovers for safer search-and-rescue missions.",
    authors_text: "A. Rivera, L. Chen",
    tags: ["robotics", "ai", "safety"],
    poster_id: 9,
    poster_username: "rivera",
    created_at: new Date().toISOString(),
    upvotes: 42,
    downvotes: 1,
  },
  {
    id: 2,
    title: "Privacy-Preserving Genomics Pipelines",
    abstract:
      "We introduce a zero-knowledge proof system that lets medical teams collaborate on human-genome data without exposing PII.",
    authors_text: "S. Kapoor, D. Yeung",
    tags: ["privacy", "genomics"],
    poster_id: 4,
    poster_username: "skapoor",
    created_at: new Date().toISOString(),
    upvotes: 35,
    downvotes: 0,
  },
  {
    id: 3,
    title: "Adaptive Flood Forecasting with Multi-Modal Sensors",
    abstract:
      "An interpretable transformer model for municipal teams that blends satellite, radar, and local sensor data for flood alerts.",
    authors_text: "I. Okafor, H. Singh, Z. Park",
    tags: ["climate", "ml"],
    poster_id: 7,
    poster_username: "okafor",
    created_at: new Date().toISOString(),
    upvotes: 27,
    downvotes: 2,
  },
  {
    id: 4,
    title: "Quantum-Safe Voting Infrastructure",
    abstract:
      "A verifiable, privacy-preserving e-voting scheme that mixes zero-knowledge proofs with post-quantum cryptography to secure municipal elections.",
    authors_text: "",
    poster_id: 13,
    poster_username: "zk-federal",
    tags: ["security", "cryptography"],
    created_at: new Date().toISOString(),
    upvotes: 31,
    downvotes: 3,
  },
  {
    id: 5,
    title: "Localized Weather Twins for Farming Co-ops",
    abstract:
      "Digital twins of microclimates that fuse drone imagery with soil telemetry for hyper-local irrigation planning in smallholder farms.",
    authors_text: "M. Diaz, F. Ochieng",
    poster_id: 16,
    poster_username: "terraforge",
    tags: ["agtech", "climate"],
    created_at: new Date().toISOString(),
    upvotes: 24,
    downvotes: 1,
  },
];

export async function getTopPosts(limit = 6): Promise<PostSummary[]> {
  try {
    const posts = await fetchFromApi<PostSummary[]>(`/posts/top?n=${limit}`);
    if (!posts.length) {
      return mockTopPosts.slice(0, limit);
    }
    return posts;
  } catch (error) {
    console.warn("Falling back to mock data for top posts:", error);
    return mockTopPosts.slice(0, limit);
  }
}
