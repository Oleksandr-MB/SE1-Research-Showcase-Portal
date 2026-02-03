# Frontend (Next.js)

This directory contains the **Next.js App Router** frontend for the Research Showcase Portal.

## Stack

- Next.js `16.1.6` + React `19.2.0`
- TypeScript `5.9.3`
- Tailwind CSS `4`

## Prerequisites

- Node.js `20 LTS` (Next.js is installed via `npm`)

## Setup & run

From the repo root:

```bash
npm --prefix src/frontend ci
npm --prefix src/frontend run dev
```

Then open `http://localhost:3000`.

## Configuration

The frontend reads configuration from `NEXT_PUBLIC_API_BASE_URL` environment variable:

- Default: `http://127.0.0.1:8000` (see `src/frontend/lib/api.ts`)
- Local override (recommended): create `src/frontend/.env.local` and set `NEXT_PUBLIC_API_BASE_URL=...`
- Alternative: export `NEXT_PUBLIC_API_BASE_URL` in your shell before running `npm --prefix src/frontend run dev`

## Useful scripts

- `npm --prefix src/frontend run dev` — start dev server
- `npm --prefix src/frontend run build` — production build
- `npm --prefix src/frontend run start` — serve production build
- `npm --prefix src/frontend run typecheck` — TypeScript typechecking
- `npm --prefix src/frontend run lint` — ESLint

## Routes (App Router)

Pages live in `src/frontend/app/`:

- `/` — feed / search
- `/terms` — terms & community guidelines
- `/register`, `/login`, `/logout` — auth flows
- `/verify-email`, `/reset-password` — token-based flows
- `/posts/new` — create a post
- `/posts/[postId]` — post details
- `/posts/[postId]/review` — write a review
- `/posts/[postId]/reviews` and `/posts/[postId]/reviews/[reviewId]` — read reviews
- `/posts/[postId]/reports` — report a post
- `/reports` — moderation dashboard (moderator role)
- `/me` and `/me/profile` — your account and profile editing
- `/[username]` — public profile page

## API integration

- API client/types live in `src/frontend/lib/api.ts`.
- The auth token is stored in `localStorage` under the key `rsp_token` and is sent as a Bearer token to the backend.
- Uploaded attachments are served by the backend under `/attachments/*` (static files).

## Notes

- Markdown (tables, images, math) is rendered via `react-markdown` + `remark-*` + `rehype-katex` in `src/frontend/components/katex.tsx`.
- Some UI screens use polling/refresh helpers (see `src/frontend/components/route-refresh-poller.tsx`) to keep content fresh without websockets.
