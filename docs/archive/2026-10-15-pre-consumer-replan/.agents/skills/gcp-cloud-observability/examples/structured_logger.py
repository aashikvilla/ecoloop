"""GCP-Native Structured JSON Logger."""
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class GCPStructuredLogger:
    def __init__(self, component: str = "ecoloop-backend"):
        self.component = component
        self.project_id = os.getenv("GCP_PROJECT_ID", "project-7eb2c8c6-27da-46d0-827")

    def _emit(
        self,
        severity: str,
        message: str,
        trace_id: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        payload = {
            "severity": severity,
            "message": message,
            "component": self.component,
            "time": datetime.now(timezone.utc).isoformat(),
        }

        if trace_id:
            payload["logging.googleapis.com/trace"] = f"projects/{self.project_id}/traces/{trace_id}"

        if extra:
            payload.update(extra)

        # Write single line JSON to stdout
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()

    def info(self, message: str, trace_id: Optional[str] = None, **kwargs) -> None:
        self._emit("INFO", message, trace_id=trace_id, extra=kwargs)

    def warning(self, message: str, trace_id: Optional[str] = None, **kwargs) -> None:
        self._emit("WARNING", message, trace_id=trace_id, extra=kwargs)

    def error(self, message: str, trace_id: Optional[str] = None, **kwargs) -> None:
        self._emit("ERROR", message, trace_id=trace_id, extra=kwargs)


logger = GCPStructuredLogger()
