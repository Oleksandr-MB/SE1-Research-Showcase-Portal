# Database (PostgreSQL + SQLAlchemy)

This directory contains the database layer for the Research Showcase Portal:

- SQLAlchemy models in `src/database/models.py`
- Engine/session setup in `src/database/db.py`
- A helper script to create the schema in `src/database/db_creator.py`

## Configuration

Database connectivity is configured via the backend env vars (see `src/backend/config/example.env`):

- `RSP_DB_BASE` (recommended: `postgresql+psycopg2`)
- `RSP_DB_HOST`, `RSP_DB_PORT`
- `RSP_DB_DATABASE`
- `RSP_DB_USER`, `RSP_DB_PASSWORD`

`src/database/db.py` builds `DATABASE_URL` from these values and, when using PostgreSQL, attempts to **create the database** if it does not exist. This requires that the configured user has permission to create databases.

## Schema overview

Main tables (see `src/database/models.py`):

- `users` — accounts, roles, profile fields, email verification state
- `posts` — research posts (title/authors/abstract/body/bibtex) + votes
- `tags` and `post_tags` — tagging many-to-many
- `attachments` — files uploaded for a post (served under `/attachments/*`)
- `comments` — threaded comments + votes
- `reviews` — peer reviews + votes
- `reports` — moderation reports (pending/open/closed)
- `post_votes`, `comment_votes`, `review_votes` — per-user voting records

## Creating the schema (dev)

The repo includes a convenience script:

```bash
python -m src.database.db_creator
```

Warning: `db_creator.py` calls `Base.metadata.drop_all(...)` and will **delete all existing tables/data** before recreating the schema. Use it only for initial setup or when you intentionally want a clean database.

## Suggested local Postgres

If you don't have PostgreSQL installed, you can run it via Docker:

```bash
docker run --name rsp-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
```

Then set `RSP_DB_HOST=localhost`, `RSP_DB_PORT=5432`, `RSP_DB_USER=postgres`, and choose a database name/password that match your setup.
