"""
Standard API success/error response helpers for the frontend notification system.
"""
from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.response import Response


class ApiErrorCode:
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK"
    CREDIT_LIMIT_EXCEEDED = "CREDIT_LIMIT_EXCEEDED"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE"
    NO_BRANCH_ASSIGNED = "NO_BRANCH_ASSIGNED"
    BRANCH_ACCESS_DENIED = "BRANCH_ACCESS_DENIED"
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND"
    SUPPLIER_NOT_FOUND = "SUPPLIER_NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    INVALID_TRANSFER = "INVALID_TRANSFER"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    NO_ACTIVE_BRANCH = "NO_ACTIVE_BRANCH"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"


def api_error(
    code: str,
    message: str,
    *,
    details: dict[str, Any] | None = None,
    http_status: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    return Response(
        {
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            },
        },
        status=http_status,
    )


def api_success(
    message: str,
    data: Any = None,
    *,
    http_status: int = status.HTTP_200_OK,
    extra: dict[str, Any] | None = None,
) -> Response:
    body: dict[str, Any] = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    if extra:
        body.update(extra)
    return Response(body, status=http_status)


def api_not_found(message: str, *, details: dict[str, Any] | None = None) -> Response:
    return api_error(
        ApiErrorCode.NOT_FOUND,
        message,
        details=details,
        http_status=status.HTTP_404_NOT_FOUND,
    )


def api_permission_denied(
    message: str = "You do not have permission to perform this action.",
    *,
    details: dict[str, Any] | None = None,
) -> Response:
    return api_error(
        ApiErrorCode.PERMISSION_DENIED,
        message,
        details=details,
        http_status=status.HTTP_403_FORBIDDEN,
    )


def api_validation_error(
    message: str,
    *,
    details: dict[str, Any] | None = None,
    http_status: int = status.HTTP_400_BAD_REQUEST,
) -> Response:
    return api_error(
        ApiErrorCode.VALIDATION_ERROR,
        message,
        details=details,
        http_status=http_status,
    )


def api_duplicate(message: str, *, details: dict[str, Any] | None = None) -> Response:
    return api_error(
        ApiErrorCode.DUPLICATE_ENTRY,
        message,
        details=details,
        http_status=status.HTTP_409_CONFLICT,
    )


def api_invalid_transfer(message: str, *, details: dict[str, Any] | None = None) -> Response:
    return api_error(
        ApiErrorCode.INVALID_TRANSFER,
        message,
        details=details,
        http_status=status.HTTP_400_BAD_REQUEST,
    )
