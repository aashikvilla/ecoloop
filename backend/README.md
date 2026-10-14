# EcoLoop Backend (FastAPI)

FastAPI service powering the EcoLoop circular economy platform.

## Features
- **FastAPI 0.115+** with automatic Swagger (`/api/v1/docs`) & ReDoc (`/api/v1/redoc`)
- **Pydantic v2** validation and settings management
- **CORS enabled** for Next.js frontend integration
- **Clean modular architecture** (`app/api/v1`, `app/core`, `app/schemas`)

## Getting Started

### 1. Requirements
- Python 3.12+ (or [`uv`](https://github.com/astral-sh/uv))

### 2. Environment Setup
```bash
# Using uv (fastest)
uv venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

uv pip install -r requirements.txt
```

Or using standard `pip`:
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Interactive API Documentation
- Swagger UI: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- OpenAPI Spec: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)
- Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
