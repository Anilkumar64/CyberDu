# CyberGuard Industry Architecture

This folder contains a production-style SaaS architecture beside the original Flask demo.

## Services

- `frontend/`: React dashboard for teacher, admin, and superadmin roles.
- `backend/`: Node.js + Express API with MongoDB/Mongoose, JWT auth, RBAC, rate limiting, audit logs, and Socket.io.
- `ml-service/`: Python FastAPI service that owns per-student model files, bootstrap, prediction, retraining, versioning, and confidence drift tracking.
- `docker-compose.yml`: Local MongoDB, backend, ML service, and frontend orchestration.

## Backend Highlights

- Mongoose schemas:
  - `User`
  - `School`
  - `Student`
  - `Message`
  - `MLModel`
  - `AuditLog`
- Auth:
  - bcrypt password hashing
  - JWT access token
  - refresh token rotation
  - protected `/api/auth/me`
- Security:
  - Helmet
  - CORS
  - rate limiting
  - simple input sanitization
  - RBAC middleware
  - audit logging service
- Real-time:
  - Socket.io rooms by user, teacher, school, and student
  - `message-flagged`
  - `critical-alert`
  - `training-progress`

## ML Service Highlights

- One isolated model directory per student under `ml-service/models/<studentId>/`.
- Bootstrap starts a student with the global base model.
- Retraining creates versioned `.pkl` files and keeps metadata.
- Last three model versions are tracked for rollback-friendly workflows.
- Prediction returns label, risk score, confidence, severity, flagged words, model version, and confidence drift score.

## Run Locally

### Original Flask Demo

```bash
source .venv/bin/activate
python app.py
```

Open `http://127.0.0.1:5050`.

### Industry Stack With Docker

```bash
docker compose up --build -d
```

Open `http://127.0.0.1:5174`.

The Docker frontend is published on port `5174` so it can run beside a local Vite server on `5173`.

### Industry Stack Manually

Terminal 1:

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 7000
```

Terminal 2:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Terminal 3:

```bash
cd frontend
npm install
npm run dev
```

You also need MongoDB running locally, or run:

```bash
docker compose up mongo
```

## Resume Line

Built CyberGuard, an industry-style student safety platform with MongoDB/Mongoose schemas, JWT and refresh token authentication, RBAC, Socket.io real-time alerts, per-student isolated ML models, model versioning, drift tracking, audit logs, and multi-role dashboards.
