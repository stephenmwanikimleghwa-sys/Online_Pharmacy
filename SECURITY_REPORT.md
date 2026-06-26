# SECURITY REPORT — Transcounty Pharmacy
**Audit Date:** 2026-06-26  
**Scope:** Django Backend + React Frontend

---

## CRITICAL ISSUES FOUND & FIXED

| # | Issue | File | Fix Applied |
|---|-------|------|-------------|
| 1 | **Dangerous SECRET_KEY default** — fallback `"your-secret-key-here-change-in-production"` would silently serve an insecure app if env var is missing | `backend/config/settings.py:24` | Removed default; app now crashes loudly if `SECRET_KEY` is not set in environment |
| 2 | **Dispensation records deletable** — `DispensationViewSet` inherited `destroy()` from `ModelViewSet`, allowing audit logs to be erased | `backend/inventory/views/dispensing.py:59` | Overrode `destroy()` to always raise `MethodNotAllowed` with clear message |
| 3 | **PostgreSQL crash on dashboard** — `ExpressionWrapper` date subtraction with `DurationField` crashes on PostgreSQL (returns int, not interval) | `backend/inventory/services/expiry.py:16` | Replaced with direct `expiry_date` date comparisons using `timedelta` — works on all DB engines |

---

## HIGH ISSUES FOUND & FIXED

| # | Issue | File | Fix Applied |
|---|-------|------|-------------|
| 4 | **No login rate limiting** — brute force attacks possible on the login endpoint | `backend/users/views/core_views.py` | Added `LoginRateThrottle(AnonRateThrottle)` with `scope = "login"` applied to `UserLoginView`; rate `5/minute` added to `DEFAULT_THROTTLE_RATES` |
| 5 | **No server-side token blacklisting on logout** — refresh tokens remained valid after logout | `backend/users/views/core_views.py` (no `LogoutView` existed) | Created `LogoutView` that blacklists the JWT refresh token via `rest_framework_simplejwt`; registered at `/api/auth/logout/` |
| 6 | **Frontend logout not calling backend** — tokens were only cleared locally, remaining reusable server-side | `frontend/src/context/AuthContext.tsx:435` | `logout()` now calls `/api/auth/logout/` (fire-and-forget) before clearing localStorage |
| 7 | **Missing `UPDATE_LAST_LOGIN`** — last_login timestamp not updated on JWT auth, reducing auditability | `backend/config/settings.py:329` | Added `"UPDATE_LAST_LOGIN": True` to `SIMPLE_JWT` config |
| 8 | **No login throttle rate configured** | `backend/config/settings.py` | Added `"login": "5/minute"` to `DEFAULT_THROTTLE_RATES` |
| 9 | **frontend/src/lib/ not tracked in git** — entire lib folder was ignored by root `.gitignore`'s `lib/` rule, breaking Render build | `.gitignore:17` | Changed `lib/` → `/lib/` to scope it to root directory only; files committed |
| 10 | **Dispensing log branch filter could bypass scoping** — `filter_queryset_for_branch` didn't handle `branch=all` for admins | `backend/users/active_branch.py:50` | Added explicit `if param == "all": return queryset` branch for admin users |

---

## MEDIUM ISSUES — AWAITING APPROVAL

| # | Issue | File | Severity | Recommendation |
|---|-------|------|----------|---------------|
| M1 | **JWT tokens in localStorage** — vulnerable to XSS. Ideal fix: HttpOnly cookies (requires significant auth flow refactoring) | `frontend/src/services/api.ts` | MEDIUM | Defer to Technical Debt; mitigated by no `dangerouslySetInnerHTML` usage |
| M2 | **27 npm vulnerabilities** (1 low, 9 moderate, 17 high) in frontend dependencies | `frontend/package-lock.json` | MEDIUM | Run `npm audit fix`; some may require `--force` or manual package upgrades |
| M3 | **Serializer over-exposure** — `UserProfileSerializer` returns all permission flags in every user response; these flags are not needed in list views | `backend/users/serializers.py:64` | MEDIUM | Create a `UserListSerializer` with minimal fields for list endpoints |
| M4 | **`CORS_ALLOW_CREDENTIALS = True`** — using Bearer tokens, not cookies; credentials flag is unnecessary and mildly broadens CORS | `backend/config/settings.py:347` | MEDIUM | Set to `False` since Bearer token auth doesn't use cookies |
| M5 | **ACCESS_TOKEN_LIFETIME = 3 hours** — audit spec recommends max 60 min | `backend/config/settings.py:327` | MEDIUM | Reduce to 60 min; ensure frontend handles token refresh gracefully |

---

## LOW ISSUES — DOCUMENTED

| # | Issue | File | Notes |
|---|-------|------|-------|
| L1 | **Node.js 18 (EOL)** on Render — end-of-life, no security updates | `render.yaml` / Render env | Upgrade `NODE_VERSION` to 20 or 22 in Render environment settings |
| L2 | **caniuse-lite database 9 months old** — browserslist warnings in build | `frontend/package.json` | Run `npx update-browserslist-db@latest` |
| L3 | **No `SENTRY_DSN` configured** — errors in production are invisible | `settings.py` | Add Sentry integration for production error tracking |
| L4 | **`EMAIL_BACKEND` is console backend** — password reset emails not sent in production | `settings.py:397` | Configure SMTP backend for production |
| L5 | **File uploads stored locally** — files lost on Render redeploy (ephemeral filesystem) | `settings.py:282` | Enable `USE_S3=True` with Supabase or AWS S3 bucket |
| L6 | **No `SECURE_HSTS_*` headers** — HSTS not configured | `settings.py` | Add `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD` for production behind HTTPS |
| L7 | **`DEBUG` defaults to `False`** (correct) but no explicit `DEBUG=False` assertion in startup | `settings.py:27` | Add deployment check script or startup assertion |

---

## POSITIVE FINDINGS (Already Secure)

- ✅ **No hardcoded secrets** — all secrets read from environment variables
- ✅ **No `.env` files in git history** — clean
- ✅ **No raw SQL / SQL injection** — all queries use Django ORM
- ✅ **No `dangerouslySetInnerHTML`** — no XSS risk from React rendering
- ✅ **`transaction.atomic()` on all financial operations** — sales, stock transfers, debt payments
- ✅ **`select_for_update()` on stock deduction** — race condition protection in `fefo.py`
- ✅ **`StaffActivityLogViewSet` is `ReadOnlyModelViewSet`** — audit logs cannot be deleted via API
- ✅ **`token_blacklist` in `INSTALLED_APPS`** — JWT blacklisting infrastructure is ready
- ✅ **`AUTH_PASSWORD_VALIDATORS`** — all 4 Django validators enabled
- ✅ **Global `AnonRateThrottle` and `UserRateThrottle`** — already configured before this audit
- ✅ **`CORS_ALLOW_ALL_ORIGINS = False`** — explicit allowed origins list used
- ✅ **`X_FRAME_OPTIONS` defaults to DENY** in Django
- ✅ **Password fields are `write_only=True`** in serializers
- ✅ **`IsAuthenticated` is the global default permission class**
