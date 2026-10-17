from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class DomainError(Exception):
    def __init__(self, code: str, message: str, status_code: int, retryable: bool = False):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "retryable": exc.retryable,
                "requestID": getattr(request.state, "request_id", "unavailable"),
            }
        },
    )


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    known = {
        401: ("UNAUTHENTICATED", "A valid Firebase identity is required."),
        403: ("FORBIDDEN", "The requested membership is not available."),
        404: ("NOT_FOUND", "The requested resource was not found."),
        413: ("PAYLOAD_TOO_LARGE", "The request exceeds the allowed size."),
        422: ("VALIDATION_ERROR", "The request does not match the required schema."),
        429: ("RATE_LIMITED", "The request limit was reached. Try again later."),
    }
    code, message = known.get(exc.status_code, ("REQUEST_FAILED", "The request could not be completed."))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": exc.status_code in (429, 503),
                "requestID": getattr(request.state, "request_id", "unavailable"),
            }
        },
        headers=exc.headers,
    )


