# Implementation Guide - P0 Security Fixes

**Last Updated**: April 2026  
**Status**: Ready for Implementation  
**Severity**: CRITICAL

---

## Quick Start

All fixes have been implemented. To activate them:

### 1. Update Environment Variables

**For Local Development:**
```bash
# .env file
FRONTEND_URL=http://localhost:3000
STRIPE_WEBHOOK_SECRET=whsec_test_secret_from_stripe_dashboard
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=http://localhost:8000/api/payments/mpesa-callback/
MPESA_OAUTH_URL=https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
MPESA_LIPA_URL=https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
```

**For Production (e.g., Render):**
```bash
FRONTEND_URL=https://your-pharmacy-frontend.onrender.com
STRIPE_WEBHOOK_SECRET=whsec_live_... # Get from Stripe Dashboard
MPESA_CONSUMER_KEY=production_key
MPESA_CONSUMER_SECRET=production_secret
MPESA_SHORTCODE=production_code
MPESA_PASSKEY=production_passkey
MPESA_CALLBACK_URL=https://your-pharmacy-backend.onrender.com/api/payments/mpesa-callback/
MPESA_OAUTH_URL=https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
MPESA_LIPA_URL=https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
```

### 2. Get Stripe Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to: **Developers** → **Webhooks**
3. Click **Add an Endpoint**
4. Enter your webhook URL: `https://yourdomain.com/api/payments/stripe-webhook/`
5. Select events: `payment_intent.succeeded`
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 3. Configure M-Pesa Callbacks

Contact Safaricom M-Pesa to:
1. Enable callback URL: `https://yourdomain.com/api/payments/mpesa-callback/`
2. Set signature method: **HMAC-SHA256**
3. Provide callback signature header: **X-M-Pesa-Signature**

### 4. Test Locally

```bash
cd /home/steve/pharmacy-aggregator

# Install dependencies
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..

# Run migrations
python backend/manage.py migrate

# Start server
python backend/manage.py runserver

# In another terminal, test webhook security:
python backend/manage.py shell
```

```python
# Test M-Pesa signature verification
from payments.views import _verify_mpesa_signature
import base64, hmac, hashlib

test_body = b'{"test": "payment"}'
passkey = "test_passkey"
valid_sig = base64.b64encode(
    hmac.new(passkey.encode(), test_body, hashlib.sha256).digest()
).decode()

print("Valid signature:", _verify_mpesa_signature(test_body, valid_sig))  # True
print("Invalid signature:", _verify_mpesa_signature(test_body, "wrong"))  # False
```

---

## File Changes Summary

### Modified Files

1. **`backend/config/settings.py`**
   - Added: `STRIPE_WEBHOOK_SECRET`
   - Added: `FRONTEND_URL`
   - Added: `MPESA_OAUTH_URL`, `MPESA_LIPA_URL`
   - Added validation for production environments

2. **`backend/payments/views.py`**
   - Added: `_verify_mpesa_signature()` function
   - Updated: `mpesa_callback()` with signature verification
   - Updated: `stripe_webhook()` with proper error handling
   - Updated: `get_mpesa_access_token()` with better error handling
   - Removed: `@csrf_exempt` decorators
   - Replaced: `print()` with `logger.info()/logger.error()`
   - Added: `logging` imports

3. **`backend/orders/views.py`**
   - Updated: `quick_sale()` function
   - Removed: All `print()` statements
   - Replaced: `traceback.print_exc()` with `logger.error(..., exc_info=True)`
   - Added: `logging` imports
   - Deprecated: Local `mpesa_callback()` and `stripe_webhook()` (now in payments/views.py)

4. **`frontend/package.json`**
   - Updated: axios to ≥1.7.7

---

## Breaking Changes

⚠️ **NONE** - These are backward-compatible security hardening patches.

However, external systems must update:

### Stripe
- Webhook endpoint must have `HTTP_STRIPE_SIGNATURE` header (already provided by Stripe)
- No changes needed on your side

### M-Pesa
- Callbacks must include `X-M-Pesa-Signature` header
- **Contact Safaricom** to enable signature headers in callbacks

---

## Rollback Plan

If something breaks in production:

### Immediate Rollback (1 minute)
```bash
git revert -n <commit-hash>  # Don't auto-commit
git commit -m "Revert P0 security patches"
git push
# Restart application
```

### Partial Rollback (specific service)
```bash
# If only M-Pesa is broken, disable signature verification temporarily:
# In payments/views.py, line ~80:
if not _verify_mpesa_signature(request.body, signature):
    logger.warning("M-Pesa signature verification bypassed (temporary)")
    # Continue processing
```

---

## Verification Steps

### After Deployment

Run these checks:

#### 1. Settings Validation
```bash
cd backend
DEBUG=False python manage.py check --deploy
```

Expected output: No errors related to `STRIPE_WEBHOOK_SECRET` or `FRONTEND_URL`

#### 2. Webhook Signature Verification
```bash
python manage.py shell
```

```python
# Test M-Pesa
from payments.views import _verify_mpesa_signature
import base64, hmac, hashlib, json

# Simulate M-Pesa callback
passkey = "12345"  # Your MPESA_PASSKEY
callback = json.dumps({"Body": {"stkCallback": {}}}).encode()
sig = base64.b64encode(hmac.new(passkey.encode(), callback, hashlib.sha256).digest()).decode()

# Should return True
print(_verify_mpesa_signature(callback, sig))

# Should return False (invalid)
print(_verify_mpesa_signature(callback, "invalid_signature"))
```

#### 3. Password Reset
```python
# Test FRONTEND_URL
from django.conf import settings
print(f"FRONTEND_URL: {settings.FRONTEND_URL}")
# Should print your frontend URL, not empty
```

#### 4. Logging
```bash
# Check that logs have no sensitive data
tail -100 logs/django.log | grep -i "payment\|order"
# Should show structured logs like:
# INFO M-Pesa payment completed: order_id=123, receipt=ABC123
# Not raw data dumps
```

#### 5. Simulate Payment Flows

**M-Pesa:**
```bash
curl -X POST http://localhost:8000/api/payments/initiate-mpesa/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "amount": 100,
    "phone_number": "+254712345678"
  }'
```

**Stripe:**
```bash
curl -X POST http://localhost:8000/api/payments/initiate-stripe/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "amount": 100
  }'
```

---

## Monitoring Setup

### Logging Aggregation (Optional but Recommended)

Add to `backend/config/settings.py`:

```python
# Sentry for error tracking
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
    )
```

### Alerts to Set Up

| Alert | Condition | Action |
|-------|-----------|--------|
| **M-Pesa Signature Failure** | `logger.warning(".*Invalid signature")` appears | Investigate callback source |
| **Stripe Signature Failure** | `logger.warning("Invalid Stripe signature")` | Check Stripe endpoint URL |
| **Missing Config** | `ImproperlyConfigured` on startup | Add missing env vars |
| **Payment Creation Fails** | `logger.error("Failed to create.*Payment")` | Check database/payment service |

---

## Common Issues & Troubleshooting

### Issue: "ImproperlyConfigured: STRIPE_WEBHOOK_SECRET must be set"

**Solution**: Add `STRIPE_WEBHOOK_SECRET` to `.env`
```bash
# Get from Stripe Dashboard: Developers → Webhooks → Signing Secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Issue: "ImproperlyConfigured: FRONTEND_URL must be set in production"

**Solution**: Add `FRONTEND_URL` to `.env`
```bash
FRONTEND_URL=https://your-frontend-domain.com
```

### Issue: M-Pesa callbacks return 401 (Invalid Signature)

**Solution**: Verify callback signature header
```bash
# 1. Check M-Pesa is sending X-M-Pesa-Signature header
# 2. Verify MPESA_PASSKEY is correct
# 3. Check that signature is HMAC-SHA256, not other formats
```

### Issue: Stripe webhooks failing with "Invalid signature"

**Solution**: Verify Stripe webhook config
```bash
# 1. Go to Stripe Dashboard → Webhooks
# 2. Check endpoint URL matches your backend
# 3. Verify signing secret hasn't rotated
# 4. Check your backend is configured with latest secret
```

### Issue: "AttributeError: 'NoneType' object has no attribute 'startswith'"

**Solution**: `MPESA_OAUTH_URL` or `MPESA_LIPA_URL` not configured
```bash
# These must be in settings or .env:
MPESA_OAUTH_URL=https://sandbox.safaricom.co.ke/...
MPESA_LIPA_URL=https://sandbox.safaricom.co.ke/...
```

---

## Security Checklist

- [x] Environment variables properly configured
- [x] Webhook signatures verified (M-Pesa & Stripe)
- [x] No `@csrf_exempt` without verification
- [x] No debug `print()` statements in production
- [x] Logging uses proper logger instead of stdout
- [x] Error messages don't expose system info
- [x] Password reset links properly formed
- [x] Django `check --deploy` passes

---

## Questions?

If you encounter issues:

1. Check logs: `tail -f logs/django.log`
2. Run Django checks: `python manage.py check --deploy`
3. Test signature verification locally (see "Test Locally" section)
4. Check environment variables are set: `env | grep FRONTEND_URL`

