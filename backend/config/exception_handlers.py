"""
DRF exception handler — normalizes all API errors to { success, error: { code, message, details } }.
"""
from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.views import exception_handler as drf_exception_handler

try:
    from ratelimit.exceptions import Ratelimited
except ImportError:
    Ratelimited = None

from config.api_responses import ApiErrorCode


def _first_message(data: Any) -> str:
    if data is None:
        return "Request could not be processed."
    if isinstance(data, str):
        return data
    if isinstance(data, list) and data:
        return _first_message(data[0])
    if isinstance(data, dict):
        if data.get("message"):
            return str(data["message"])
        if data.get("code") and data.get("message"):
            return str(data["message"])
        for key in ("non_field_errors", "detail", "error"):
            if key in data:
                return _first_message(data[key])
        for val in data.values():
            msg = _first_message(val)
            if msg:
                return msg
    return "Request could not be processed."


def _flatten_details(data: Any) -> dict[str, Any]:
    if isinstance(data, dict):
        if "error" in data and isinstance(data["error"], dict):
            return data["error"].get("details") or {}
        return data
    if isinstance(data, list):
        return {"non_field_errors": data}
    return {"detail": data}


def structured_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    if isinstance(data, dict) and data.get("success") is False and "error" in data:
        return response

    status_code = response.status_code
    code = ApiErrorCode.VALIDATION_ERROR
    message = _first_message(data)
    details = _flatten_details(data)

    # django-ratelimit's Ratelimited subclasses Django's core PermissionDenied,
    # so without this it would render as a misleading 403 "You do not have
    # permission to perform this action." It must be checked BEFORE the generic
    # PermissionDenied/403 handling below. Map it to a proper 429.
    if Ratelimited is not None and isinstance(exc, Ratelimited):
        code = ApiErrorCode.VALIDATION_ERROR
        message = "Too many attempts. Please wait a minute and try again."
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, NotAuthenticated):
        code = ApiErrorCode.SESSION_EXPIRED
        message = "Your login session has expired. Please log in again to continue."
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, AuthenticationFailed):
        code = ApiErrorCode.INVALID_CREDENTIALS
        message = _first_message(exc.detail) or "Authentication failed."
        status_code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, PermissionDenied):
        code = ApiErrorCode.PERMISSION_DENIED
        message = _first_message(exc.detail) or (
            "You do not have permission to perform this action."
        )
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, NotFound):
        code = ApiErrorCode.PRODUCT_NOT_FOUND
        message = _first_message(exc.detail) or "The requested resource could not be found."
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, Throttled):
        code = ApiErrorCode.VALIDATION_ERROR
        message = "You have made too many requests. Please wait a moment and try again."
        status_code = status.HTTP_429_TOO_MANY_REQUESTS
    elif isinstance(exc, ValidationError):
        code = ApiErrorCode.VALIDATION_ERROR
        message = _first_message(data) or "Please check the information you entered and try again."
    elif status_code == 404:
        code = ApiErrorCode.PRODUCT_NOT_FOUND
        message = message or "The requested resource could not be found."
    elif status_code == 403:
        code = ApiErrorCode.PERMISSION_DENIED
    elif status_code == 409:
        code = ApiErrorCode.DUPLICATE_ENTRY
    elif status_code >= 500:
        code = ApiErrorCode.VALIDATION_ERROR
        message = "Something went wrong on our end. Please try again in a moment."

    response.data = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details if isinstance(details, dict) else {},
        },
    }
    response.status_code = status_code
    return response
