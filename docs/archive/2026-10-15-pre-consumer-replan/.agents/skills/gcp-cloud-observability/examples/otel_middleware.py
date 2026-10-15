"""FastAPI Middleware for Correlating Trace Context with Cloud Run."""
import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .structured_logger import logger


class CloudTraceCorrelationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()

        # Cloud Run injects X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1
        trace_header = request.headers.get("X-Cloud-Trace-Context")
        trace_id = None
        if trace_header:
            trace_id = trace_header.split("/")[0]

        # Attach to request state for downstream handler access
        request.state.trace_id = trace_id

        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Log request completion in GCP JSON format
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms)",
            trace_id=trace_id,
            http_request={
                "requestMethod": request.method,
                "requestUrl": str(request.url),
                "status": response.status_code,
                "latency": f"{duration_ms / 1000.0}s",
            },
        )

        return response
