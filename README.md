# SE1 Research Showcase Portal

<p align="center">
  <a href="https://github.com/Oleksandr-MB/SE1-Research-Showcase-Portal/actions/workflows/test-ci.yml">
    <img src="https://github.com/Oleksandr-MB/SE1-Research-Showcase-Portal/actions/workflows/test-ci.yml/badge.svg" alt="CI Status" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-yellow?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/SQL_Alchemy-20-red?logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Node.js-20-darkgreen?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Postgresql-17-blue?logo=Postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/backend%20coverage-93%25-green" alt="Backend coverage" />
  <img src="https://img.shields.io/badge/license-MIT-black" alt="License" />
  <img src="https://img.shields.io/website?url=https://research-showcase-portal-frontend.azurewebsites.net/" alt="Website" />
</p>


Research Showcase Portal is a full-stack academic platform where researchers can create profiles, publish research posts, upload attachments, and engage in peer review and discussion. It was built as part of the **Software Engineering 1 (SE1)** course at University of Luxembourg.

Component-level documentation:
- Frontend: `src/frontend/README.md`
- Backend: `src/backend/README.md`
- Database: `src/database/README.md`

## What you can do (features)

- **Accounts & roles**: registration, email verification, login/logout, password reset, role-based access (user / researcher / moderator).
- **Research posts**: create/search posts with tags, rich content (incl. LaTeX via KaTeX), attach files, download attachments.
- **Peer review**: write and read structured `openreview.net` inspired peer reviews, surface higher-quality feedback.
- **Community**: comment threads, upvote/downvote posts and comments.
- **Moderation**: reporting workflow (pending/open/closed), moderator tooling, content deletion with ownership checks.
- **Quality-of-life**: responsive UI, polling-based refresh, citation sharing/export.

## Tech stack (and versions)

| Area | Tech | Version |
| --- | --- | --- |
| Frontend | Next.js | `16.0.x` |
| Frontend | React | `19.2.0` |
| Frontend | TypeScript | `5.9.3` |
| Backend | FastAPI | (see `requirements.txt`) |
| Backend | Python | `3.12` (CI) |
| Database | PostgreSQL | recommended (via `psycopg2-binary`) |
| Testing | Python `unittest` + `coverage.py` | backend coverage: `93%` (see `coverage.txt`) |

## Project layout

```text
.
├─ src/
│  ├─ frontend/         # Next.js app (UI)
│  ├─ backend/          # FastAPI app (REST API)
│  └─ database/         # SQLAlchemy models + DB engine
├─ tst/                 # backend test suite (unittest)
├─ .github/workflows/   # CI + Azure deployments
└─ deliverables/        # course deliverables (PDF)
```

## Quickstart (local development)

### Prerequisites

- Python `3.12`
- Node.js `20 LTS`
- A running PostgreSQL server instance (local install or Docker)

### 1) Configure backend environment

The backend reads configuration from environment variables (`RSP_*`). Start by creating a local env file:

```bash
cp src/backend/config/example.env src/backend/config/.env
```

Edit `src/backend/config/.env` (see `src/backend/config/example.env`) and then load it into your shell:

```bash
set -a
source src/backend/config/.env
set +a
```

### 2) Install dependencies

Backend (from repo root):

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Frontend:

```bash
npm --prefix src/frontend ci
```

### 3) Initialize the database schema

This helper script creates tables **and drops existing ones** (safe for first run; destructive afterwards):

```bash
source .venv/bin/activate
python -m src.database.db_creator
```

### 4) Run the app

Backend (Terminal A):

```bash
set -a; source src/backend/config/.env; set +a
source .venv/bin/activate
python -m src.backend.main
```

Frontend (Terminal B):

```bash
npm --prefix src/frontend run dev
```

URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- OpenAPI docs: `http://127.0.0.1:8000/docs`

## Testing

Backend unit tests:

```bash
set -a; source src/backend/config/.env; set +a
source .venv/bin/activate
python -m unittest discover -s tst -p "test_*.py"
```

Backend coverage (requires `coverage.py`):

```bash
python -m coverage run --source=src -m unittest discover -s tst -p "test_*.py"
python -m coverage report -m
```

Frontend typecheck:

```bash
npm --prefix src/frontend run typecheck
```

## Deployment (Azure)

This repo includes GitHub Actions workflows to deploy:
- Frontend → Azure Web App (`.github/workflows/azure-ci-frontend.yml`)
- Backend → Azure Web App (`.github/workflows/azure-ci-backend.yml`)

Production frontend URL: `https://research-showcase-portal-frontend.azurewebsites.net`

## Usage example


## Authors

<table>
   <tbody>
   <tr>
      <td align="center">
         <a href="https://github.com/Oleksandr-MB">
         <img src="https://github.com/Oleksandr-MB.png?size=120" width="120" alt="Oleksandr Marchenko Breneur" />
         <br />
         <sub><b>Oleksandr Marchenko Breneur</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/DemyanFaguer">
         <img src="https://github.com/DemyanFaguer.png?size=120" width="120" alt="Demyan Faguer" />
         <br />
         <sub><b>Demyan Faguer</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/YaroslavAkhramenko">
         <img src="https://github.com/YaroslavAkhramenko.png?size=120" width="120" alt="Yaraslaw Akhramenka" />
         <br />
         <sub><b>Yaraslaw Akhramenka</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/TenderChasm">
         <img src="https://github.com/TenderChasm.png?size=120" width="120" alt="Adelaide Danilova" />
         <br />
         <sub><b>Adelaide Danilova</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/Jester0101">
         <img src="https://github.com/Jester0101.png?size=120" width="120" alt="Add contributor photo" />
         <br />
         <sub><b>Oleksandr Yeroftieiev</b></sub>
         </a>
      </td>
   </tr>
   </tbody>
</table>

## Copyright

MIT License. See `LICENSE`.