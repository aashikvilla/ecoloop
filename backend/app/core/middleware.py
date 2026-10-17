from __future__ import annotations

from uuid import uuid4

from starlette.exceptions import HTTPException as StarletteHTTPException


class RequestBoundaryMiddleware:
    """Adds request metadata and bounds streamed request bodies without buffering them."""

    def __init__(self, app, max_request_bytes: int, max_photo_bytes: int, allowed_origins: list[str]):
        self.app = app
        self.max_request_bytes = max_request_bytes
        self.max_photo_bytes = max_photo_bytes
        self.allowed_origins = set(allowed_origins)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        content_length = next(
            (value.decode("latin-1") for key, value in scope.get("headers", []) if key.lower() == b"content-length"),
            None,
        )
        path = scope.get("path", "")
        is_photo_upload = path.endswith("/intakes/photo") or (path.endswith("/media") and "/offers/" in path)
        request_limit = self.max_photo_bytes if is_photo_upload else self.max_request_bytes
        if content_length is not None:
            try:
                declared_length = int(content_length)
                if declared_length < 0:
                    raise ValueError
            except ValueError:
                await self._send_error(send, 400, "INVALID_CONTENT_LENGTH", "The request could not be processed.", request_id, scope)
                return
            if declared_length > request_limit:
                await self._send_error(send, 413, "PAYLOAD_TOO_LARGE", "The request exceeds the allowed size.", request_id, scope)
                return

        total_bytes = 0

        async def bounded_receive():
            nonlocal total_bytes
            message = await receive()
            if message["type"] == "http.request":
                total_bytes += len(message.get("body", b""))
                if total_bytes > request_limit:
                    raise StarletteHTTPException(status_code=413)
            return message

        async def response_send(message):
            if message["type"] == "http.response.start":
                managed = {b"x-request-id", b"cache-control", b"x-content-type-options"}
                headers = [
                    (key, value)
                    for key, value in message.get("headers", [])
                    if key.lower() not in managed
                ]
                headers.extend(
                    [
                        (b"x-request-id", request_id.encode("ascii")),
                        (b"cache-control", b"no-store"),
                        (b"x-content-type-options", b"nosniff"),
                    ]
                )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, bounded_receive, response_send)

    async def _send_error(self, send, status_code: int, code: str, message: str, request_id: str, scope) -> None:
        body = (
            '{"error":{"code":"'
            + code
            + '","message":"'
            + message
            + '","retryable":false,"requestID":"'
            + request_id
            + '"}}'
        ).encode("utf-8")
        origin = next((value.decode("latin-1") for key, value in scope.get("headers", []) if key.lower() == b"origin"), None)
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"x-request-id", request_id.encode("ascii")),
            (b"cache-control", b"no-store"),
            (b"x-content-type-options", b"nosniff"),
        ]
        if origin in self.allowed_origins:
            headers.extend([
                (b"access-control-allow-origin", origin.encode("latin-1")),
                (b"access-control-allow-credentials", b"true"),
                (b"vary", b"Origin"),
            ])
        await send(
            {
                "type": "http.response.start",
                "status": status_code,
                "headers": headers,
            }
        )
        await send({"type": "http.response.body", "body": body, "more_body": False})
