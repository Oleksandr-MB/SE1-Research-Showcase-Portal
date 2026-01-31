# SE1-Research-Showcase-Portal

A comprehensive academic platform where researchers can create profiles, publish their research papers, share abstracts, and showcase their work. The portal features a peer review system, community engagement through comments and voting, and moderation tools to maintain content quality.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Team](#team)
- [License](#license)

## Features

### User Management
- **User Registration & Authentication**: Secure registration with email verification
- **Password Reset**: Self-service password recovery system
- **Role-Based Access Control**: Three user roles (User, Researcher, Moderator)
- **Profile Management**: Customizable user profiles
- **Auto-Promotion**: Automatic promotion to Researcher role based on activity and peer reviews

### Research Showcase
- **Post Creation**: Upload research papers, abstracts, and supporting documents (PDF attachments)
- **Post Deletion**: Post owners can delete their own posts with confirmation dialog
- **Tagging System**: Organize posts with tags for easy discovery
- **Rich Content**: Support for formatted text and LaTeX equations (KaTeX)
- **File Management**: Upload and download research materials

### Peer Review System
- **Post Reviews**: Comprehensive review system for research papers
- **Review Voting**: Community can upvote/downvote reviews for quality control
- **Review Visibility**: Public reviews to foster transparency

### Community Engagement
- **Comments**: Discussion threads on posts and reviews
- **Comment Deletion**: Comment owners can delete their own comments with confirmation dialog
- **Voting System**: Upvote/downvote posts and reviews
- **User Profiles**: View other researchers' profiles and contributions

### Moderation & Reporting
- **Content Reporting**: Report inappropriate posts or reviews
- **Report Management**: Moderators can review and resolve reports
- **Content Moderation**: Both content creators and moderators can delete posts/comments
- **Status Tracking**: Reports have statuses (Pending, Open, Closed)
- **User Promotion**: Moderators can manually promote users to Researcher role

### User Experience
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Real-time Updates**: Polling system for live content updates
- **Loading States**: Skeleton loaders for better UX
- **Citation Export**: Generate citations for research papers

## Technology Stack

### Backend
- **FastAPI**: Modern, high-performance Python web framework
- **SQLAlchemy**: SQL toolkit and ORM for database operations
- **PostgreSQL**: Robust relational database (via psycopg2-binary)
- **Pydantic**: Data validation using Python type annotations
- **PyJWT & python-jose**: JWT token authentication
- **Passlib with Argon2**: Secure password hashing
- **APScheduler**: Background task scheduling
- **Uvicorn**: ASGI server for FastAPI

### Frontend
- **Next.js 16**: React framework with server-side rendering
- **React 19**: Modern React with hooks
- **TypeScript 5.9**: Type-safe JavaScript
- **Tailwind CSS 4**: Utility-first CSS framework
- **KaTeX**: LaTeX equation rendering

### Development Tools
- **ESLint**: JavaScript/TypeScript linting
- **Python unittest**: Backend testing framework

## Project Structure
### Please consult /deliverables/presentation.pdf/Project Structure

## Installation & Setup

   Create a `.env` file in `src/backend/config/` with the following variables:
   
   **Database Configuration**:
   - `RSP_DB_BASE` - Database base URL
   - `RSP_DB_HOST` - Database host
   - `RSP_DB_PORT` - Database port
   - `RSP_DB_DATABASE` - Database name
   - `RSP_DB_USER` - Database username
   - `RSP_DB_PASSWORD` - Database password
   
   **Security Settings**:
   - `RSP_CRYPTO_KEY` - Secret key for JWT signing (minimum 32 characters)
   - `RSP_CRYPTO_ALGORITHM` - Algorithm for JWT (e.g., HS256)
   
   **Token Expiration**:
   - `RSP_TOKEN_ACCESS_EXPIRE_MINUTES` - Access token lifetime
   - `RSP_TOKEN_EMAIL_EXPIRE_MINUTES` - Email verification token lifetime
   
   **Email Configuration**:
   - `RSP_EMAIL_LINK_BASE` - Base URL for email verification links
   - `RSP_EMAIL_RESET_LINK_BASE` - Base URL for password reset links
   - `RSP_SMTP_SERVER` - SMTP server address
   - `RSP_SMTP_PORT` - SMTP server port
   - `RSP_SMTP_SENDER` - Sender email address
   - `RSP_SMTP_PASSWORD` - SMTP password
   
   **Application Settings**:
   - `RSP_SCHED_DELETE_EXPIRED_USERS_INTERVAL_MINUTES` - Cleanup interval for expired users
   - `RSP_MODERATOR_EMAILS` - Comma-separated list of moderator emails
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

1. **Start the Backend** (from project root):
   ```bash
   source .venv/bin/activate  # Activate virtual environment
   python -m src.backend.main
   ```
   The backend API will be available at `http://127.0.0.1:8000`

2. **Start the Frontend** (from `src/frontend`):
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`

### Production Mode

1. **Build and Start the Backend**:
   ```bash
   source .venv/bin/activate
   uvicorn src.backend.main:app --host 0.0.0.0 --port 8000
   ```

2. **Build and Start the Frontend**:
   ```bash
   cd src/frontend
   npm run build
   npm start
      ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure API endpoint**:
   Ensure the API endpoint in `lib/api.ts` points to your backend URL (default: `http://127.0.0.1:8000`)

## Running the Application

### Development Mode

**Start the Backend** (from project root):
```bash
source .venv/bin/activate  # Activate virtual environment
python -m src.backend.main
```
The backend API will be available at `http://127.0.0.1:8000`

**Start the Frontend** (from `src/frontend`):
```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`

### Production Mode

**Backend**:
```bash
uvicorn src.backend.main:app --host 0.0.0.0 --port 8000
```

**Frontend**:
```bash
cd src/frontend
npm run build
npm start
```

## API Documentation

The backend provides a RESTful API built with FastAPI. Once the backend is running, you can access:

- **Interactive API Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **Alternative API Documentation (ReDoc)**: `http://127.0.0.1:8000/redoc`
- **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`

### Main API Endpoints
- `/users/*`: User authentication, registration, and profile management
- `/posts/*`: Research post creation, retrieval, management, and deletion
- `/posts/{id}/comments/*`: Comment creation and deletion
- `/posts/{id}/reviews/*`: Peer review system
- `/reports/*`: Content reporting and moderation
- `/attachments/*`: Static file serving for uploaded documents

### Content Deletion
The platform supports content deletion with the following features:
- **Post Deletion**: `DELETE /posts/{post_id}` - Post owners and moderators can delete posts
- **Comment Deletion**: `DELETE /posts/{post_id}/comments/{comment_id}` - Comment owners and moderators can delete comments
- **Confirmation Dialog**: Frontend shows confirmation before deletion:
  - Posts: "Are you sure you want to delete this post?"
  - Comments: "Are you sure you want to delete this comment?"
- **Ownership Verification**: Delete buttons only visible to content creators (and moderators)
- **Automatic Cleanup**: Deleting a post or comment automatically closes related reports

## Testing

### Backend Tests

Run all backend tests from the project root:
```bash
.venv/bin/python -m unittest discover -s tst -p 'test_*.py'
```

### Frontend Type Checking

From project root:
```bash
npm --prefix src/frontend run typecheck
```

Or from `src/frontend` directory:
```bash
npm run typecheck
```

For more details on CI/CD, see `docs/CI_CD.md`

## Deployment

### Azure Deployment

The application is configured for deployment on Microsoft Azure:

- **Backend**: Can be deployed to Azure App Service or Azure Container Instances
- **Frontend**: Deployed to Azure Static Web Apps or Azure App Service
  - Production URL: `https://research-showcase-portal-frontend.azurewebsites.net`
- **Database**: Azure Database for PostgreSQL

### CORS Configuration

The backend is configured to accept requests from:
- Local development: `http://127.0.0.1:3000`, `http://localhost:3000`
- Production: `https://research-showcase-portal-frontend.azurewebsites.net`

Update CORS settings in `src/backend/main.py` for additional origins.

## Contributing

We welcome contributions to the Research Showcase Portal! Here's how you can help:

### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/SE1-Research-Showcase-Portal.git
   cd SE1-Research-Showcase-Portal
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```




## Team

**Team 10** - University of Luxembourg, Software Engineering 1 (SE1), Semester 5

1. Adelaide Danilov
2. Oleksandr Marchenko Breneur
3. Demyan Faguer
4. Yaraslaw Akhramenka
5. Oleksandr Yeroftieiev

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Oleksandr Marchenko Breneur et al.

---

**Built with ❤️ for the research community**
