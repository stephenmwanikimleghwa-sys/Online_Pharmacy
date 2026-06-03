# CORS Error & 502 Gateway Fix Guide

## Problem Summary
Frontend (`https://online-pharmacy-1-np3y.onrender.com`) cannot communicate with backend API (`https://online-pharmacy-sn88.onrender.com/api`) due to:
1. **CORS policy error**: Missing `Access-Control-Allow-Origin` header
2. **502 Bad Gateway**: Backend server not responding properly

## Root Cause Analysis

### CORS Configuration Status
✅ **Already Correct in Code**:
- `django-cors-headers` package installed in `requirements.txt`
- `CorsMiddleware` properly positioned at top of middleware stack
- Both frontend and backend URLs listed in `CORS_ALLOWED_ORIGINS`
- Regex pattern for `.onrender.com` subdomains configured
- All necessary HTTP methods and headers allowed

### Why CORS Headers Aren't Being Sent
The 502 Bad Gateway error indicates the **backend server is crashing or failing to start**, preventing it from sending any responses, including CORS headers.

## Troubleshooting Steps

### Step 1: Check Backend Logs on Render
1. Go to https://dashboard.render.com
2. Select the `pharmacy-aggregator-backend` service
3. Click **"Logs"** tab
4. Look for errors like:
   - `ModuleNotFoundError` or `ImportError`
   - `psycopg2` connection errors
   - `django.core.exceptions.ImproperlyConfigured`
   - Database migration failures

### Step 2: Verify Environment Variables

**Critical Variables to Check on Render Dashboard**:

Go to service settings > **Environment** and verify:

```
DEBUG=false
SECRET_KEY=[auto-generated]
ALLOWED_HOSTS=.onrender.com,online-pharmacy-sn88.onrender.com
DJANGO_SETTINGS_MODULE=config.settings
DATABASE_URL=[MUST BE SET - should start with postgresql://]
CORS_ALLOWED_ORIGINS=https://online-pharmacy-1-np3y.onrender.com,https://online-pharmacy-sn88.onrender.com
CSRF_TRUSTED_ORIGINS=https://online-pharmacy-sn88.onrender.com,https://online-pharmacy-1-np3y.onrender.com
REDIS_URL=[should be set via fromService in render.yaml]
```

**⚠️ Critical**: `DATABASE_URL` must be set! It should be configured in Render's environment variables, NOT in `render.yaml` (hardcoded credentials are a security risk).

### Step 3: Check Database Connectivity

The most common cause of 502 errors is database connection failure:

1. Verify `DATABASE_URL` format is correct:
   ```
   postgresql://user:password@host:port/dbname
   ```

2. Ensure the database:
   - Is running and accessible from Render
   - User credentials are correct
   - Port is open (usually 5432 for PostgreSQL)

3. Test with a simple query in backend logs by checking if migrations complete

### Step 4: Verify Python Dependencies

Run this locally to ensure all dependencies install correctly:

```bash
cd backend
pip install -r requirements.txt
```

If you get errors, the backend will also fail on Render with same errors.

### Step 5: Check Dockerfile Configuration

Verify `Dockerfile.render` includes:
- Python 3.11+ installation
- System dependencies (libpq-dev for psycopg2)
- Django setup

### Step 6: Redeploy Backend Service

Once you've verified environment variables and dependencies:

1. Go to Render dashboard
2. Select `pharmacy-aggregator-backend` service
3. Click **"Manual Deploy"** > **"Deploy latest commit"**
4. Watch the logs carefully for errors during:
   - Build phase
   - Pre-deploy command (migrations)
   - Service startup

## Quick Fixes Summary

### Fix 1: Remove Hardcoded Credentials
✅ **Already Applied** in `render.yaml` - DATABASE_URL is now removed from YAML (should be set in Render dashboard)

### Fix 2: Ensure CORS Headers are Being Sent
Once backend is working, verify with curl:

```bash
curl -i -X OPTIONS \
  -H "Origin: https://online-pharmacy-1-np3y.onrender.com" \
  https://online-pharmacy-sn88.onrender.com/api/inventory/list/
```

Look for response header:
```
Access-Control-Allow-Origin: https://online-pharmacy-1-np3y.onrender.com
```

### Fix 3: Test API Endpoint with Auth Token

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://online-pharmacy-sn88.onrender.com/api/inventory/list/?per_page=1000
```

## If Still Getting CORS Error After 502 is Fixed

1. **Check middleware order** in `config/settings.py`:
   - `CorsMiddleware` must be FIRST (before Django's SecurityMiddleware)

2. **Verify credentials config**:
   - `CORS_ALLOW_CREDENTIALS = True` (already set ✓)

3. **Check for conflicting middleware**:
   - Ensure no other middleware is stripping CORS headers

4. **Review SecurityHeadersMiddleware**:
   - Check `config/security.py` to ensure it's not blocking CORS

## Testing CORS Locally

If running locally with separate frontend/backend:

**Backend (.env)**:
```
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend (vite.config.js or .env)**:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

Then run:
```bash
# Terminal 1 - Backend
cd backend && python manage.py runserver

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Additional Commands for Debugging

### Check if corsheaders is installed on Render
```bash
python -m pip show django-cors-headers
```

### Verify Django settings
```bash
python manage.py shell
>>> from django.conf import settings
>>> print(settings.CORS_ALLOWED_ORIGINS)
>>> print(settings.INSTALLED_APPS)
>>> print('corsheaders' in settings.INSTALLED_APPS)
```

### Test migrations
```bash
python manage.py migrate --plan
python manage.py migrate --noinput --verbosity 2
```

## Summary

Your CORS configuration is correctly set up in the code. The **primary issue is the 502 Bad Gateway error**, which indicates:

1. ✅ CORS configuration is correct
2. ❌ Backend server is not starting/responding
3. 🔧 Need to fix: Database connection, dependencies, or environment variables

**Next Action**: Check Render backend logs for the specific startup error, then address that issue. Once the backend is running, CORS headers should work automatically.
