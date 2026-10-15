# Cloud Run Dockerfile & Deployment Guide

## Production Dockerfile (`backend/Dockerfile`)

```dockerfile
# Use official lightweight Python image
FROM python:3.12-slim

# Prevent Python from writing .pyc and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install Python dependencies
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Copy backend code
COPY . .

# Run with uvicorn listening on Cloud Run PORT
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1
```

## Cloud Build & Deployment Commands

```bash
# 1. Build and push container to Google Artifact Registry
gcloud builds submit \
  --tag gcr.io/project-7eb2c8c6-27da-46d0-827/ecoloop-backend:latest \
  backend/

# 2. Deploy service to Cloud Run
gcloud run deploy ecoloop-backend \
  --image gcr.io/project-7eb2c8c6-27da-46d0-827/ecoloop-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production \
  --min-instances 0 \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1
```
