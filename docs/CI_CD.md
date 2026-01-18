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

