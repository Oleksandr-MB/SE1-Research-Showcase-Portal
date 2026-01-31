# CI/CD

## What CI runs

GitHub Actions workflow: `.github/workflows/ci.yml`

- Backend: `python -m unittest discover -s tst -p "test_*.py"`
- Frontend: `npm --prefix src/frontend run typecheck`

## Run locally

Backend (using repo venv):

- `.venv/bin/python -m unittest discover -s tst -p "test_*.py"`

Frontend:

- `npm --prefix src/frontend ci`
- `npm --prefix src/frontend run typecheck`

## Next: CD (Azure/AWS)

Before wiring deployment, decide:

- Deployment shape: **containers** vs **managed runtimes**
- Hosting split: deploy **frontend** and **backend** separately (recommended)
- Attachments storage: current backend serves from local disk; for cloud, move to **object storage** (Azure Blob / AWS S3)
- Database: Postgres in cloud (Azure Database for PostgreSQL / AWS RDS)

Typical paths:

- **Azure**:
  - Frontend: Azure Static Web Apps (or App Service)
  - Backend: Azure App Service (Python) or Container Apps
  - DB: Azure Database for PostgreSQL
  - Files: Azure Blob Storage
- **AWS**:
  - Frontend: S3 + CloudFront (or Amplify)
  - Backend: ECS Fargate (container) or Elastic Beanstalk (Python)
  - DB: RDS Postgres
  - Files: S3

When you're ready, we can add:

- Dockerfiles + a `docker-compose.yml` for local parity
- A `deploy.yml` workflow that builds + pushes images and deploys to Azure/AWS using repo secrets

## Azure App Service quick notes (current repo)

- Frontend lives in `src/frontend` (Next.js). Ensure `NEXT_PUBLIC_API_BASE_URL` is set to your backend URL at **build time** (in GitHub Actions via `secrets.NEXT_PUBLIC_API_BASE_URL`, see `.github/workflows/main_research-showcase-portal-frontend.yml`) or the app will default to `http://127.0.0.1:8000`.
- Use Node `20.x` (matches `.github/workflows/main_research-showcase-portal-frontend.yml`).
- Backend is FastAPI; App Service needs a startup command like `python -m uvicorn src.backend.main:app --host 0.0.0.0 --port 8000` (or a `gunicorn` equivalent) and the frontend `NEXT_PUBLIC_API_BASE_URL` should point at that deployed backend.
