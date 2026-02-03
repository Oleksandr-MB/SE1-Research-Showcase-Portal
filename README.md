# SE1 Research Showcase Portal

<p align="center">
  <a href="https://github.com/Oleksandr-MB/SE1-Research-Showcase-Portal/actions/workflows/tests.yml">
    <img src="https://github.com/Oleksandr-MB/SE1-Research-Showcase-Portal/actions/workflows/tests.yml/badge.svg" alt="CI Status" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-346C99?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.123-009485?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/SQLAlchemy-20-CA2727?logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Node.js-20-689F63?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/backend%20coverage-92%25-green" alt="Backend Coverage" />
  <img src="https://img.shields.io/badge/license-MIT-black" alt="License" />
  <img src="https://img.shields.io/website?url=https://research-showcase-portal-frontend.azurewebsites.net/" alt="Website Status" />
</p>

Research Showcase Portal is a full-stack academic platform where researchers can create profiles, publish research posts, upload attachments, and engage in peer review and discussion. It was built as part of the **Software Engineering 1 (SE1)** course at University of Luxembourg.

Component-level documentation:
- Frontend: `src/frontend/README.md`
- Backend: `src/backend/README.md`
- Database: `src/database/README.md`

## What you can do (features)

- **Accounts & roles**: registration, email verification, login/logout, password reset, role-based access (user / researcher / moderator).
- **Research posts**: create/search posts with tags, rich content (incl. LaTeX via KaTeX and image rendering), attach files, download attachments.
- **Peer review**: write and read structured `openreview.net` inspired peer reviews, surface higher-quality feedback.
- **Community**: comment threads, upvote/downvote posts and comments.
- **Moderation**: reporting workflow (pending/open/closed), moderator tooling, content deletion with ownership checks.
- **Quality-of-life**: responsive UI, polling-based refresh, citation sharing/export.

## Tech stack (and versions)

| Area | Tech | Version |
| --- | --- | --- |
| Frontend | Next.js | `16.1.6` |
| Frontend | React | `19.2.0` |
| Frontend | TypeScript | `5.9.3` |
| Backend | FastAPI | `0.123.8` |
| Backend | Python | `3.12` |
| Database | PostgreSQL | `17` (recommended via `psycopg2-binary`) |

## Project layout

```text
./
├── src/
│   ├── backend/                        # FastAPI backend application
│   │   ├── README.md                   # Backend documentation
│   │   ├── main.py                     # Application entry point and API setup
│   │   ├── config/                     # Configuration utilities and .env files
│   │   └── services/                   # Business logic and API routess
│   │
│   ├── database/                       # Database layer
│   │   ├── README.md                   # Database documentation
│   │   ├── db.py                       # Database connection and session management
│   │   ├── db_creator.py               # Database initialization
│   │   └── models.py                   # SQLAlchemy ORM models
│   │
│   └── frontend/                       # Next.js frontend application
│       ├── README.md                   # Frontend documentation
│       ├── app/                        # Next.js app directory (pages)
│       ├── components/                 # Reusable React components
│       ├── lib/                        # Utility functions and hooks
│       ├── public/                     # Static assets
│       └── *other*                     # Other Next.js / React files
│
├── tst/                                # Test suite
│
├── deliverables/                       # Project deliverables and documentation
│
├── requirements.txt                    # Python dependencies
├── LICENSE                             # MIT License
└── README.md                           # This file
```

## Quickstart (local development)

### Prerequisites

- Python `3.12`
- Node.js `20 LTS`
- A running PostgreSQL server instance (local install or Docker; see `src/database/README.md` for a one-liner)

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

Note: signup/login requires email verification. SMTP must be configured (see `src/backend/README.md`).

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
- Frontend → Azure Web App (`.github/workflows/azure-deployment-frontend.yml`)
- Backend → Azure Web App (`.github/workflows/azure-deployment-backend.yml`)

Production frontend URL (website): `https://research-showcase-portal-frontend.azurewebsites.net`
Production backend URL (OpenAPI): `https://research-showcase-portal-backend.azurewebsites.net/docs`

**Note:** We use Azure's burstable database tier (not intended for production deployment) as well as the cheapest available Web App tiers, thus responses may be quite slow.

## Usage example

<p align="center">
   <a href="https://www.youtube.com/watch?v=Ryi2NFj4SrY">
      <img height=405 src="https://markdown-videos-api.jorgenkh.no/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DRyi2NFj4SrY" alt="Usage example" title="Usage example"/>
   </a>
</p>

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
         <a href="https://github.com/TenderChasm">
         <img src="https://github.com/TenderChasm.png?size=120" width="120" alt="Adelaide Danilova" />
         <br />
         <sub><b>Adelaide Danilov</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/Jester0101">
         <img src="https://github.com/Jester0101.png?size=120" width="120" alt="Add contributor photo" />
         <br />
         <sub><b>Oleksandr Yeroftieiev</b></sub>
         </a>
      </td>
      <td align="center">
         <a href="https://github.com/YaroslavAkhramenko">
         <img src="https://github.com/YaroslavAkhramenko.png?size=120" width="120" alt="Yaraslaw Akhramenka" />
         <br />
         <sub><b>Yaraslaw Akhramenka</b></sub>
         </a>
      </td>
   </tr>
   </tbody>
</table>

## Contributing

We welcome your further contributions to the Research Showcase Portal!

Here's how you can help:

1. **Fork** the repository and create a new branch for your feature or fix.
2. **Make your improvements** (please follow existing code style).
3. **Run checks**: backend tests (`python -m unittest discover -s tst -p "test_*.py"`) and frontend typecheck (`npm --prefix src/frontend run typecheck`).
4. **Update documentation** if you change APIs or add features.
5. **Submit a pull request** with a clear description of your changes.

## Copyright

MIT License. See `LICENSE`.
