# Backend (FastAPI)

This directory contains the **FastAPI** backend for the Research Showcase Portal.

## Architecture at a glance

- Entry point: `src/backend/main.py`
- Routers live in: `src/backend/services/*.py`
- Database layer: `src/database/` (SQLAlchemy + PostgreSQL)
- Attachments: stored in `src/backend/uploads/` and served as static files under `/attachments/*`

## Prerequisites

- Python `3.12` and dependencies listed in `requirements.txt`
- A running PostgreSQL server instance

## Configuration (required)

The backend reads configuration from environment variables (`RSP_*`). A template is provided in:

- `src/backend/config/example.env`

Create your local env file:

```bash
cp src/backend/config/example.env src/backend/config/.env
```

Load the env file before running the API (the app does **not** auto-load `.env`):

```bash
set -a
source src/backend/config/.env
set +a
```

### Environmental variables

The required keys are validated in `src/backend/config/config_utils.py` and include:

- DB settings: `RSP_DB_BASE`, `RSP_DB_HOST`, `RSP_DB_PORT`, `RSP_DB_DATABASE`, `RSP_DB_USER`, `RSP_DB_PASSWORD`
- Crypto settings: `RSP_CRYPTO_KEY`, `RSP_CRYPTO_ALGORITHM`
- `RSP_TOKEN_ACCESS_EXPIRE_MINUTES`, `RSP_TOKEN_EMAIL_EXPIRE_MINUTES`
- Scheduler settings: `RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES`
- SMTP settings: `RSP_SMTP_SERVER`, `RSP_SMTP_PORT`, `RSP_SMTP_SENDER`, `RSP_SMTP_PASSWORD`, `RSP_EMAIL_LINK_BASE`, `RSP_EMAIL_RESET_LINK_BASE`
- Moderator bootstrap: `RSP_MODERATOR_EMAILS` (required to assign the first moderators to avoid cold-start problem)
- Rate limiting: `RSP_RATE_LIMIT_MAX`, `RSP_RATE_LIMIT_WINDOW_SECONDS`

## Install & run

From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt

set -a; source src/backend/config/.env; set +a
python -m src.backend.main
```

Backend runs on `http://127.0.0.1:8000`.

### Production run

```bash
set -a; source src/backend/config/.env; set +a
source .venv/bin/activate
uvicorn src.backend.main:app --host 0.0.0.0 --port 8000
```

## API docs

When running locally:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Main routes (high level)

- `POST /users/register` — create an account (email verification token is generated)
- `GET /users/verify-email?token=...` — verify email
- `POST /users/login` / `POST /users/logout` — auth
- `POST /users/request-password-reset` / `POST /users/reset-password` — password reset
- `GET /posts` / `GET /posts/{id}` — search/read posts
- `POST /posts` / `DELETE /posts/{id}` — create/delete post (owner/moderator)
- `POST /posts/attachments/upload` — upload attachment (returns `/attachments/<file>`)
- `POST /posts/{id}/comments` — add comment (and threaded replies)
- `POST /posts/{id}/reviews` — add review
- `POST /reports` / `PATCH /reports/{id}` — reporting workflow (moderator)

Exact routes and request/response schemas are defined in `src/backend/services/*` and surfaced via OpenAPI.

## Auth model (JWT)

- Login returns a JWT where `sub` is the username.
- The frontend stores the token in `localStorage` as `rsp_token` and sends it as `Authorization: Bearer <token>`.
- Logout revokes the token **in-memory** (`_revoked_tokens` in `user_service.py`), so revocations are cleared on server restart.

## Background cleanup job

`src/backend/services/user_service.py` includes a scheduler helper (`start_cleanup_scheduler`) intended to delete unverified users after the email-token expiration window.
