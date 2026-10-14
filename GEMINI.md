# Gemini Model Coding Instructions for EcoLoop

This document provides direct coding instructions for Gemini models and assistants working on the EcoLoop codebase.

## Code Standards & Style

1. **Python (Backend)**:
   - Use Python 3.12+ features (type hints, `match`/`case`, standard library updates).
   - Use Pydantic v2 exclusively (`model_validate`, `model_dump`, `ConfigDict`). Do not use deprecated v1 methods like `.dict()` or `.parse_obj()`.
   - Never write blocking sync I/O inside `async def` endpoints; use `asyncio.to_thread` or native async libraries (`httpx`, `asyncpg`, async firestore).
   - All router endpoints must define explicit `response_model`, `status_code`, and OpenAPI `tags`.

2. **TypeScript / Next.js (Frontend)**:
   - Use Next.js 15 App Router conventions (`app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
   - Use React 19 functional components with strict TypeScript types for all props and state.
   - Use Client Components (`"use client"`) only when handling browser state, events, or local storage. Default to Server Components.
   - Styling: Use Tailwind CSS with mobile-first responsiveness (minimum width 360px viewport tested).

3. **Google GenAI SDK**:
   - Import pattern:
     ```python
     from google import genai
     from google.genai import types
     ```
   - For structured outputs, always pass `types.GenerateContentConfig(response_mime_type="application/json", response_schema=...)`.
   - Always set temperature between `0.0` and `0.2` for extraction/classification tasks to minimize nondeterminism.

4. **Safety & Authorization**:
   - Any endpoint performing state mutation must verify the caller's tenancy and permission scope.
   - Do not log sensitive user tokens, full authorization headers, or private schedules.
