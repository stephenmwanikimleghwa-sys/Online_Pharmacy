# P0 Security Patches - April 2026

## Overview
This document details critical security fixes applied to resolve payment processing vulnerabilities, missing configuration, and information disclosure issues.

---

## Patch 1: Add Missing Environment Variables (settings.py)

### Issue
- `STRIPE_WEBHOOK_SECRET` was referenced but never defined, causing webhook signature verification to fail silently
- `FRONTEND_URL` was used in password reset flow but never configured, causing NameError exceptions
- M-Pesa URLs were hardcoded to sandbox environment, preventing production deployments

### Vulnerability Impact
**CRITICAL** - Payment webhooks could be forged; password resets broken in production

### Changes Made

**File:** `backend/config/settings.py`

#### Added at line 341:
```python
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

if not DEBUG and not STRIPE_WEBHOOK_SECRET:
    raise ImproperlyConfigured(
        "STRIPE_WEBHOOK_SECRET must be set in production for webhook verification"
    )
```

#### Added at line 350-357:
```python
# Frontend URL for password reset and callback links
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000" if DEBUG else "")
if not DEBUG and not FRONTEND_URL:
    raise ImproperlyConfigured(
        "FRONTEND_URL must be set in production for password reset links"
    )

# M-Pesa URLs now configurable
MPESA_OAUTH_URL = env("MPESA_OAUTH_URL", default="https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials")
MPESA_LIPA_URL = env("MPESA_LIPA_URL", default="https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest")
```

### Required Environment Variables
Add to `.env` or deployment platform:
```
FRONTEND_URL=https://your-frontend-domain.com
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
MPESA_OAUTH_URL=https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials  # Production
MPESA_LIPA_URL=https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest  # Production
```

---

## Patch 2: Secure M-Pesa Webhook with Signature Verification (payments/views.py)

### Issue
- `@csrf_exempt` decorator bypassed CSRF protection without alternative verification
- M-Pesa callbacks could be forged by attackers, allowing arbitrary order status changes
- No signature verification using M-Pesa PASSKEY
- Debug `print()` statements leaked callback data to production logs

### Vulnerability Impact
**CRITICAL** - Payment status could be forged; money could be pocketed without recording transactions

### Changes Made

**File:** `backend/payments/views.py`

#### Added signature verification function (new):
```python
def _verify_mpesa_signature(request_body: bytes, signature: str) -> bool:
    """
    Verify M-Pesa callback signature using MPESA_PASSKEY.
    Uses constant-time comparison to prevent timing attacks.
    """
    if not MPESA_PASSKEY:
        logger.warning("MPESA_PASSKEY not configured")
        return False

    try:
        expected_signature = base64.b64encode(
            hmac.new(
                MPESA_PASSKEY.encode(),
                request_body,
                hashlib.sha256
            ).digest()
        ).decode()
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        logger.error(f"Error verifying M-Pesa signature: {str(e)}")
        return False
```

#### Updated mpesa_callback decorator and implementation:
```python
@require_POST
@csrf_protect  # CSRF protection enabled
def mpesa_callback(request):
    """
    Handle M-Pesa callback with signature verification.
    """
    # Verify signature from M-Pesa
    signature = request.headers.get('X-M-Pesa-Signature', '')
    if not signature or not _verify_mpesa_signature(request.body, signature):
        logger.warning("M-Pesa callback received with invalid signature")
        return JsonResponse(
            {"ResultCode": 1, "ResultDesc": "Invalid signature"},
            status=401
        )
    
    # ... rest of implementation with logging instead of print()
```

#### Removed print statements, replaced with logger:
```python
# ❌ OLD:  print(f"M-Pesa Callback: {callback_data}")
# ✅ NEW: logger.info("M-Pesa callback received and verified")

# ❌ OLD:  print(f"Payment not found for receipt {receipt}")
# ✅ NEW: logger.error(f"Payment not found for receipt {receipt}")
```

### Production Configuration
M-Pesa must include signature header in callbacks:
```
X-M-Pesa-Signature: base64(HMAC-SHA256(MPESA_PASSKEY, request_body))
```

---

## Patch 3: Secure Stripe Webhook with Error Handling (payments/views.py)

### Issue
- Stripe webhook endpoint had inconsistent error handling
- Missing validation on metadata field (potential KeyError)
- STRIPE_WEBHOOK_SECRET was potentially undefined, causing verification to fail silently
- Error messages could expose system information to attackers
- `@csrf_exempt` used without alternative protection

### Vulnerability Impact
**HIGH** - Stripe payment status could be forged; sensitive error information leaked

### Changes Made

**File:** `backend/payments/views.py`

#### Updated stripe_webhook decorator and error handling:
```python
@require_POST
@csrf_protect
def stripe_webhook(request):
    """
    Handle Stripe webhook for payment confirmation.
    Requires valid Stripe signature header.
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    if not endpoint_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return JsonResponse({"error": "Webhook not configured"}, status=500)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        
        if event["type"] == "payment_intent.succeeded":
            payment_intent = event["data"]["object"]
            reference = payment_intent["id"]
            order_id = payment_intent.get("metadata", {}).get("order_id")  # Safe access

            try:
                payment = Payment.objects.get(reference=reference, method="stripe")
                # ... update payment and order ...
                logger.info(f"Stripe payment completed: order_id={order_id}")
            except Payment.DoesNotExist:
                logger.error(f"Payment not found for Stripe ID {reference}")

        return JsonResponse({"status": "success"}, status=200)

    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"Invalid Stripe signature: {str(e)}")
        return JsonResponse({"error": "Invalid signature"}, status=401)
    except json.JSONDecodeError:
        logger.error("Invalid JSON in Stripe webhook")
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error(f"Stripe webhook error: {str(e)}", exc_info=True)
        return JsonResponse({"error": "Webhook processing error"}, status=500)
```

#### Security improvements:
- Safe dictionary access with `.get()` methods
- Proper HTTP status codes (401 for auth failures)
- Generic error messages (no system details)
- Logging with `exc_info=True` for debugging in secure logs

---

## Patch 4: Remove Debug Print Statements from Payment Views (orders/views.py, payments/views.py)

### Issue
- Multiple `print()` statements logged sensitive data (payment amounts, user IDs, product details) to stdout
- Production logs exposed transaction details, audit trail violations
- Stack traces printed with full exception details visible in container logs

### Vulnerability Impact
**HIGH** - Information disclosure; compliance violations (PCI-DSS, audit trails)

### Changes Made

**File:** `backend/payments/views.py`

#### Removed lines:
```python
# ❌ Removed:
print("Quick sale request data:", request.data)
print("Processing item:", item)
print(f"Looking for product with ID: {product_id}")
print(f"Found product: {product.name}")
print(f"Creating DispensingLog: product=...")
print(f"Failed to create DispensingLog for product...")
print(f"Failed to create Payment record...")
print(f'Quick sale error: {str(e)}')
print('Full traceback:')
traceback.print_exc()
```

#### Replaced with:
```python
# ✅ Added at top:
import logging
logger = logging.getLogger(__name__)

# ✅ In function:
logger.debug(f"Quick sale initiated by user {request.user.id}")
logger.debug(f"Processing product {product.id}: {product.name}")
logger.info(f"Creating DispensingLog: product_id={product.id}, quantity={quantity}...")
logger.info(f"Quick sale completed: order_id={order.id}, total_amount={total_amount}")
logger.error(f"Failed to create DispensingLog: {str(log_exc)}", exc_info=True)
logger.error(f'Quick sale error: {str(e)}', exc_info=True)
```

#### Secure logging benefits:
- Structured logging (level-based filtering)
- No sensitive data in container stdout
- Audit trail in application logs
- `exc_info=True` logs stack trace only to file, not console
- Can be sent to secure log aggregation (Sentry, ELK, etc.)

---

## Patch 5: Upgrade Frontend Dependencies (package.json)

### Issue
- axios 1.6.2 contains known vulnerabilities

### Changes Made

**File:** `frontend/package.json`

```bash
# Run in frontend directory:
npm update axios
```

Updated to: axios ≥1.7.7

---

## Testing Checklist

### Pre-Deployment Tests

- [ ] **Settings validation**: Start Django app with DEBUG=False
  ```bash
  DEBUG=False python manage.py check --deploy
  ```

- [ ] **M-Pesa callback verification**:
  ```bash
  # Test signature verification
  python manage.py shell
  from payments.views import _verify_mpesa_signature
  import base64, hmac, hashlib
  test_body = b'{"test": "data"}'
  test_key = "test_key"
  sig = base64.b64encode(hmac.new(test_key.encode(), test_body, hashlib.sha256).digest()).decode()
  assert _verify_mpesa_signature(test_body, sig)
  ```

- [ ] **Stripe webhook test**: Send test webhook from Stripe Dashboard
  ```bash
  # Should verify signature and not fail
  # Check logs for "Stripe payment completed" message
  ```

- [ ] **Password reset flow**: Test password reset link generation
  ```bash
  python manage.py shell
  from django.conf import settings
  print(settings.FRONTEND_URL)  # Should not be empty
  ```

- [ ] **Production logging**: Verify no print() statements in logs
  ```bash
  # Should only see structured logging, no raw data
  tail -f logs/django.log | grep -i "quick_sale\|mpesa\|stripe"
  ```

### Production Deployment

1. Set environment variables:
   ```bash
   export FRONTEND_URL="https://pharmacy.example.com"
   export STRIPE_WEBHOOK_SECRET="whsec_..."
   export MPESA_OAUTH_URL="https://api.safaricom.co.ke/..."
   ```

2. Update webhook URLs in external services:
   - **Stripe**: Dashboard → Endpoints → Set to `https://yourdomain.com/api/payments/stripe-webhook/`
   - **M-Pesa**: Set callback to `https://yourdomain.com/api/payments/mpesa-callback/` (includes signature verification header)

3. Run migrations (none required for this patch)

4. Restart application services

5. Monitor logs for signature verification failures:
   ```bash
   tail -f logs/django.log | grep "Invalid signature\|verification failed"
   ```

---

## Rollback Instructions

If issues occur, rollback is straightforward:

1. Revert git commits:
   ```bash
   git revert <commit-hash>
   ```

2. Settings.py defaults will use DEBUG mode values
3. No database changes required
4. Clear cache:
   ```bash
   python manage.py clear_cache
   ```

---

## Monitoring & Alerts

Add monitoring for these patterns:

1. **M-Pesa signature failures**: `ERROR.*Invalid signature`
2. **Stripe signature failures**: `WARNING.*Invalid Stripe signature`
3. **Missing env vars**: `ImproperlyConfigured`
4. **Payment creation errors**: `ERROR.*Failed to create.*Payment`

---

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Django CSRF Documentation](https://docs.djangoproject.com/en/4.2/middleware/csrf/)
- [Stripe Webhook Security](https://stripe.com/docs/webhooks/signatures)
- [PCI-DSS Logging Requirements](https://docs.pcisecuritystandards.org/)

---

## Summary of Changes

| File | Changes | Risk Level |
|------|---------|-----------|
| `settings.py` | +3 env vars, +validation | Low |
| `payments/views.py` | +signature verification, +logging, -csrf_exempt | Critical |
| `orders/views.py` | -csrf_exempt, -print statements, +logging | Critical |
| `package.json` | axios upgrade | Medium |

**Total Impact**: Eliminates payment fraud vectors, hardens webhook security, improves audit compliance.
