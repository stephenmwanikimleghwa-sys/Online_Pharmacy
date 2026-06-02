"""Shared query param validation for report endpoints."""
from config.api_responses import api_validation_error


def parse_days_param(request, *, default: int = 30, max_days: int = 366):
    raw = request.query_params.get("days")
    if raw is None:
        return default, None
    try:
        days = int(raw)
    except (TypeError, ValueError):
        return None, api_validation_error(
            "Days must be a whole number.",
            details={"days": str(raw)},
        )
    if days < 1 or days > max_days:
        return None, api_validation_error(
            f"Days must be between 1 and {max_days}.",
            details={"days": days},
        )
    return days, None
