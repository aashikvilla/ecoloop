# Stack Constraints & Deployment Rules

1. **Backend Infrastructure (Google Cloud Run)**:
   - Base image: `python:3.12-slim`.
   - Process must bind to `0.0.0.0` and read the port from `$PORT` (default 8000).
   - Container must be stateless; local files in `/tmp` or `.venv` are ephemeral.
   - Long-lived sessions and state must be persisted to Firestore.
   - Health endpoint `GET /health` must respond with HTTP 200 within 2 seconds with no external blocking dependencies.

2. **Frontend Infrastructure (Firebase App Hosting)**:
   - Frontend must build cleanly with Next.js 15+ App Router (`npm run build`).
   - Configuration lives in `frontend/apphosting.yaml`.
   - Environment variables must be segmented into build-time public variables (`NEXT_PUBLIC_*`) and server-only secrets.

3. **Google GenAI / Vertex AI Integration**:
   - Use official `google-genai` SDK.
   - When deploying to Cloud Run, utilize Application Default Credentials (ADC) to access Vertex AI models (`gemini-2.5-flash` or `gemini-1.5-flash`).
   - For local development, support `GEMINI_API_KEY` via python-dotenv.
