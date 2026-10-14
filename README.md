# EcoLoop 🌱♻️

> A unified circular economy platform connecting sustainable material recovery, recycling pipelines, and lifecycle tracking.

This monorepo houses both the Next.js frontend application and the FastAPI Python backend service.

---

## 📁 Repository Structure

```text
ecoloop/
├── frontend/             # Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS
│   ├── src/
│   │   └── app/          # App router pages & layouts
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies & scripts
│   └── README.md
│
├── backend/              # FastAPI Python 3.12+ REST API
│   ├── app/
│   │   ├── api/v1/       # REST API endpoints (health, items, catalog)
│   │   ├── core/         # Settings, configuration, CORS
│   │   ├── schemas/      # Pydantic data schemas & models
│   │   └── main.py       # FastAPI application entrypoint
│   ├── requirements.txt  # Python dependencies
│   ├── pyproject.toml    # Python project configuration
│   └── README.md
│
├── package.json          # Monorepo root scripts
├── .gitignore            # Monorepo-wide ignore rules
└── README.md             # Project overview & documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Python**: 3.12+ (or [`uv`](https://docs.astral.sh/uv/))
- **Git**

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Option A: Using uv (Fastest)
uv venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

uv pip install -r requirements.txt

# Option B: Using standard Python venv
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/api/v1/health`

---

### 3. Frontend Setup (Next.js)

```bash
cd frontend

npm install
npm run dev
```

- Web App URL: `http://localhost:3000`

---

### 4. Root Convenience Scripts

From the repository root:

```bash
# Start frontend dev server
npm run dev:frontend

# Build frontend
npm run build:frontend

# Lint frontend
npm run lint:frontend
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.12, Pydantic v2, Uvicorn |
| **Package Management** | npm / pnpm (Frontend), uv / pip (Backend) |
| **API Architecture** | RESTful JSON API with automatic OpenAPI 3.1 specs |
