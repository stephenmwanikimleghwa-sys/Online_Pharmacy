"""Offline sync endpoint. POST /api/sync/ replays a batch of operations that a
branch client queued while offline, applying each exactly once."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from config.api_responses import ApiErrorCode, api_error, api_success
from inventory.models.sync import SyncOpStatus
from inventory.services.sync import SyncApplyError, apply_operation
from users.active_branch import require_active_branch, resolve_request_branch
from users.permissions import IsPharmacistOrAdmin

import logging

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsPharmacistOrAdmin])
def sync_operations(request):
    """Apply queued offline operations.

    Body: {"operations": [{client_uuid, op_type, payload, client_created_at?}, ...]}
    Returns: {"results": [{client_uuid, status, server_id?, discrepancy?, error?}, ...]}

    Each operation runs in its own savepoint: one bad op fails only itself, the
    rest still apply. Dedup by client_uuid makes the whole call safe to retry.
    """
    denied = require_active_branch(request)
    if denied:
        return denied

    branch = resolve_request_branch(request, request.data.get("branch_id"))
    if not branch:
        return api_error(
            ApiErrorCode.BRANCH_ACCESS_DENIED,
            "A valid active branch is required to sync.",
            http_status=status.HTTP_403_FORBIDDEN,
        )

    operations = request.data.get("operations", [])
    if not isinstance(operations, list):
        return api_error(
            ApiErrorCode.VALIDATION_ERROR,
            "`operations` must be a list.",
        )

    results = []
    for op in operations:
        client_uuid = op.get("client_uuid") if isinstance(op, dict) else None
        try:
            with transaction.atomic():  # savepoint per op
                result = apply_operation(op, branch, request.user)
            results.append(result)
        except SyncApplyError as exc:
            # Permanent: bad payload / unknown product. Tell the client not to retry.
            results.append({
                "client_uuid": str(client_uuid) if client_uuid else None,
                "status": SyncOpStatus.ERROR,
                "error": str(exc),
            })
        except IntegrityError:
            # A concurrent request already recorded this client_uuid — treat as
            # duplicate rather than error (the effect was applied once).
            results.append({
                "client_uuid": str(client_uuid) if client_uuid else None,
                "status": SyncOpStatus.DUPLICATE,
            })
        except Exception as exc:  # noqa: BLE001 - transient; client should retry
            logger.exception("sync op failed (uuid=%s): %s", client_uuid, exc)
            results.append({
                "client_uuid": str(client_uuid) if client_uuid else None,
                "status": SyncOpStatus.CONFLICT,
                "error": "Temporary failure applying operation; will retry.",
            })

    applied = sum(1 for r in results if r["status"] == SyncOpStatus.APPLIED)
    return api_success(
        f"Synced {applied} of {len(results)} operation(s).",
        data={"results": results},
        extra={"results": results},
    )
