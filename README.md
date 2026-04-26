# CyberGuard - Cyberbullying Prediction System

CyberGuard is a Flask and machine learning project for detecting cyberbullying in student messages. It now includes a real backend workflow: authentication, database-backed student data, prediction logging, human labeling, batch analysis, and model retraining from records stored in SQLite.

## Resume Highlights

- Built a full-stack ML application with Flask, SQLite, scikit-learn, and a responsive HTML/CSS/JavaScript dashboard.
- Implemented secure signup/login using hashed passwords and session-based authentication.
- Designed a database-backed dataset pipeline where student messages can be predicted, labeled, and reused for future training.
- Added model retraining from database records using TF-IDF features and an ensemble classifier.
- Added teacher-facing workflows for manual labeled data entry, batch message analysis, dataset review, and model metrics.

## Features

- User signup, login, logout, and protected API routes.
- SQLite database with users, student samples, prediction history, labels, and model training runs.
- Cyberbullying prediction with risk score, confidence, severity, and flagged terms.
- Saved predictions that can be labeled as safe or cyberbullying.
- Manual training sample entry for verified student data.
- Batch analysis for up to 20 messages at a time.
- Retrain button that rebuilds `model.pkl` from labeled database samples.
- Dashboard metrics for total, labeled, safe, bullying, and model accuracy.

## Project Structure

```text
.
├── app.py                # Flask API, auth, database, ML training, prediction routes
├── static/index.html     # Login/signup and dashboard frontend
├── requirements.txt      # Python dependencies
├── model.pkl             # Generated trained model
└── cyberguard.db         # Generated SQLite database after first run
```

## Run Locally

### Full Docker Stack

The recommended setup runs MongoDB, the ML service, the backend, and the React frontend with Docker Compose:

```bash
docker compose up --build -d
```

Open:

```text
http://127.0.0.1:5174
```

Health checks:

```bash
curl http://127.0.0.1:7000/health
curl http://127.0.0.1:8080/api/health
```

Use **Signup** first for a new teacher account. After login, add a student from the dashboard, select that student, and analyze a message.

Stop the stack:

```bash
docker compose down
```

Remove MongoDB data too:

```bash
docker compose down -v
```

### Original Flask Demo

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5050
```

Create an account, analyze messages, label saved records, and click **Retrain Model** to train from the database dataset.

## API Overview

- `POST /api/signup` creates a teacher account.
- `POST /api/login` starts a session.
- `POST /api/logout` clears the session.
- `GET /api/me` returns the current user.
- `POST /api/predict` predicts one message and optionally saves it.
- `POST /api/batch` predicts and saves multiple messages.
- `GET /api/samples` lists student samples.
- `POST /api/samples` adds a labeled training sample.
- `PATCH /api/samples/<id>/label` updates a sample label.
- `POST /api/retrain` trains the model from labeled database data.
- `GET /api/stats` returns dashboard and model metrics.

## Next Tier-1 Improvements

An industry-level scaffold has been added in separate folders:

- `backend/` - Node.js, Express, MongoDB/Mongoose, JWT auth, RBAC, audit logs, Socket.io alerts.
- `ml-service/` - Python FastAPI per-student ML model service with bootstrap, prediction, retraining, versioning, and drift tracking.
- `frontend/` - React role-based dashboard scaffold for teachers, admins, and superadmins.
- `INDUSTRY_ARCHITECTURE.md` - run instructions and architecture explanation.

Recommended next build steps:

- Add CSV import/export for student datasets and prediction reports.
- Add email/SMS parent notification through SendGrid or Twilio.
- Add automated tests with pytest, Jest, and CI through GitHub Actions.
- Add explainability using top TF-IDF terms, LIME, or SHAP.
- Add data privacy controls for anonymizing student names in exports.
# CyberDu
