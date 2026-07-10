"""
Transcounty Pharmacy Aggregator - Django Settings
Copyright (c) 2024 Transcounty Pharmacy Aggregator
Author: Steve [Your Full Name]
Created: [Current Date]
License: MIT
"""

import os
from pathlib import Path
from datetime import timedelta
import environ
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool("DEBUG", default=False)

# When running behind a proxy (like Render) that terminates SSL, respect
# the X-Forwarded-Proto header so Django knows the original request scheme.
# This prevents HTTPS redirect loops when SECURE_SSL_REDIRECT is enabled.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ALLOWED_HOSTS handling: support three formats via env var:
#  - empty / not set -> use sensible defaults
#  - comma-separated list (e.g. ".onrender.com,example.com") -> parsed into list
#  - single '*' -> allow all hosts (use with caution)
_allowed_raw = env("ALLOWED_HOSTS", default="")
if _allowed_raw.strip() == "":
    ALLOWED_HOSTS = [
        "localhost",
        "127.0.0.1",
        ".onrender.com",
    ]
elif _allowed_raw.strip() == "*":
    # Explicit wildcard requested
    ALLOWED_HOSTS = ["*"]
else:
    # Parse comma-separated list
    ALLOWED_HOSTS = [h.strip() for h in _allowed_raw.split(",") if h.strip()]

# Always ensure .onrender.com is allowed (prevents Render deploy lockouts)
# and pick up the auto-set RENDER_EXTERNAL_HOSTNAME env var if present.
_render_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
if ALLOWED_HOSTS != ["*"]:
    if ".onrender.com" not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(".onrender.com")
    if _render_hostname and _render_hostname not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_render_hostname)

# CSRF: required for HTTPS (e.g. Django admin login on Render). Comma-separated full origins.
# Example: https://online-pharmacy-sn88.onrender.com,https://example.com
_csrf_origins_raw = env("CSRF_TRUSTED_ORIGINS", default="")


def _csrf_trusted_origins_from_allowed_hosts() -> list:
    origins: list = []
    for host in ALLOWED_HOSTS:
        if not host or host == "*" or host.startswith("."):
            continue
        origins.append(f"https://{host}")
    return origins


if _csrf_origins_raw.strip():
    CSRF_TRUSTED_ORIGINS = [
        o.strip() for o in _csrf_origins_raw.split(",") if o.strip()
    ]
elif DEBUG:
    CSRF_TRUSTED_ORIGINS = [
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]
else:
    CSRF_TRUSTED_ORIGINS = _csrf_trusted_origins_from_allowed_hosts()
    CSRF_TRUSTED_ORIGINS.append("https://*.onrender.com")
    
    # Render sets this to the service public URL (helps when ALLOWED_HOSTS is only ".onrender.com")
    _render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip().rstrip("/")
    if _render_url and _render_url not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_render_url)

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # Required for JWT token blacklisting on logout
    "corsheaders",
    "django_filters",
    "storages",
    "drf_yasg",
    # Local apps (complete ones only)
    # Local apps
    "health",
    "users",
    "products",
    "orders",
    "payments",
    "prescriptions",
    "reviews",
    "patients",
    "reports",
    "clinical",
    "inventory",
    "finance",
    "dispensing_logs",
    "dashboard",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "config.security.SecurityHeadersMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Add ratelimit middleware only if the package is installed
try:
    import django_ratelimit  # noqa: F401
    MIDDLEWARE.append("django_ratelimit.middleware.RatelimitMiddleware")
except ImportError:
    pass

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Database Configuration
# Use DATABASE_URL from environment if available (e.g., on Render)
raw_database_url = os.getenv("DATABASE_URL", "")
database_url = raw_database_url.strip()

if database_url:
    if not database_url.startswith(
        (
            "postgres://",
            "postgresql://",
            "pgsql://",
            "redshift://",
            "mysql://",
            "sqlite://",
            "oracle://",
            "mssql://",
            "cockroach://",
            "timescale://",
        )
    ):
        raise ImproperlyConfigured(
            "DATABASE_URL is set but invalid. It must start with a supported scheme "
            "(e.g. postgresql://...)."
        )

    DATABASES = {
        "default": dj_database_url.config(
            default=database_url,
            conn_max_age=600 if not DEBUG else 0,
            conn_health_checks=True,
            ssl_require=not DEBUG
            or (database_url and ".render.com" in database_url),
        )
    }
else:
    # Fall back to separate environment variables for local development
    DATABASES = {
        "default": env.db(
            "DATABASE_URL",
            default=f"postgresql://{env('DB_USER', default='postgres')}:{env('DB_PASSWORD', default='password')}@{env('DB_HOST', default='localhost')}:{env('DB_PORT', default='5432')}/{env('DB_NAME', default='transcounty_pharmacy')}"
        )
    }

# Explicitly ensure sslmode: require for remote hosts if not already set by dj_database_url
_db_host = DATABASES["default"].get("HOST", "")
if _db_host and _db_host not in ["localhost", "127.0.0.1", "db"]:
    if "OPTIONS" not in DATABASES["default"]:
        DATABASES["default"]["OPTIONS"] = {}
    if "sslmode" not in DATABASES["default"]["OPTIONS"]:
        DATABASES["default"]["OPTIONS"]["sslmode"] = "require"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Media files / object storage
# Local by default, optional S3-compatible storage (e.g., Supabase Storage S3 API).
USE_S3 = env.bool("USE_S3", default=False)

# AWS/S3-compatible settings (used when USE_S3=True)
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default="")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = env.bool("AWS_QUERYSTRING_AUTH", default=False)
AWS_S3_FILE_OVERWRITE = False
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

if USE_S3 and AWS_STORAGE_BUCKET_NAME and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    # Django 4.2+ storage configuration
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    # Keep static served by WhiteNoise; only media goes to S3-compatible storage.
    MEDIA_URL = (
        f"{AWS_S3_ENDPOINT_URL.rstrip('/')}/{AWS_STORAGE_BUCKET_NAME}/"
        if AWS_S3_ENDPOINT_URL
        else f"https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/"
    )
else:
    # Allow WhiteNoise to serve media in production when S3 is missing
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework settings
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.BranchAwareJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "PAGE_SIZE_QUERY_PARAM": "page_size",
    "MAX_PAGE_SIZE": 500,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "pharmacist": "5000/hour",
        "admin": "10000/hour",
        "login": "5/minute",
    },
    "EXCEPTION_HANDLER": "config.exception_handlers.structured_exception_handler",
}

# JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=3),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# CORS settings
# NOTE: CORS_ALLOW_ALL_ORIGINS=True and CORS_ALLOW_CREDENTIALS=True are
# mutually exclusive in django-cors-headers. When both are set the middleware
# silently refuses to add the Access-Control-Allow-Origin header.
# Instead, we list allowed origins explicitly + use a regex catch-all for
# Render subdomains. The middleware will echo back the matching origin.
CORS_ALLOW_CREDENTIALS = True

# Build allowed origins: merge hardcoded defaults with env var (comma-separated)
_cors_defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://online-pharmacy-1-np3y.onrender.com",
    "https://online-pharmacy-sn88.onrender.com",
]
_cors_env = env("CORS_ALLOWED_ORIGINS", default="")
_cors_from_env = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else []
CORS_ALLOWED_ORIGINS = list(set(_cors_defaults + _cors_from_env))

# Support regex for any onrender.com subdomain (useful for review apps)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.onrender\.com$",
]

# Explicitly allow all standard methods (including OPTIONS for preflight)
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# Allow specific headers for DRF and JWT
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# Cache preflight responses for 1 hour to reduce OPTIONS requests
CORS_PREFLIGHT_MAX_AGE = 3600

# Custom user model
AUTH_USER_MODEL = "users.User"

# Email backend (for future use)
# Email backend: use SMTP in production, console in dev (console prints to stdout, never sends)
EMAIL_BACKEND = (
    "django.core.mail.backends.console.EmailBackend"
    if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

# Stripe settings
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

# Frontend URL for password reset and callback links
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000" if DEBUG else "")

# Mpesa Daraja settings
MPESA_CONSUMER_KEY = env("MPESA_CONSUMER_KEY", default="")
MPESA_CONSUMER_SECRET = env("MPESA_CONSUMER_SECRET", default="")
MPESA_SHORTCODE = env("MPESA_SHORTCODE", default="")
MPESA_PASSKEY = env("MPESA_PASSKEY", default="")
MPESA_CALLBACK_URL = env("MPESA_CALLBACK_URL", default="")
MPESA_OAUTH_URL = env("MPESA_OAUTH_URL", default="https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials")
MPESA_LIPA_URL = env("MPESA_LIPA_URL", default="https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest")

# Logging configuration
# By default, log to console only (suitable for platforms like Render).
# Set LOG_TO_FILE=True to enable file logging and ensure the directory exists.
LOG_TO_FILE = env.bool("LOG_TO_FILE", default=False)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

if LOG_TO_FILE:
    logs_dir = BASE_DIR / "logs"
    try:
        logs_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        # Fall back to console-only if directory cannot be created
        LOG_TO_FILE = False
    else:
        LOGGING["handlers"]["file"] = {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": str(logs_dir / "django.log"),
            "formatter": "verbose",
        }
        LOGGING["root"]["handlers"].append("file")

# Security settings
if not DEBUG:
    # Disable internal redirect loop; Render handles HTTPS redirection.
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_REFERRER_POLICY = "same-origin"
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# Redis for caching (optional for future scaling)
_raw_redis_url = env("REDIS_URL", default="")
# Validate that REDIS_URL is actually a URL and not a CLI command
REDIS_URL = _raw_redis_url if _raw_redis_url.startswith(("redis://", "rediss://", "unix://")) else ""

# Configure caches: use Redis when REDIS_URL is provided, otherwise use local memory
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                # Don't blow up the site if Redis is temporarily unavailable
                "IGNORE_EXCEPTIONS": True,
            },
        }
    }
else:
    # Fallback to in-memory cache when no REDIS_URL is configured (safer in first deploys)
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "transcounty-cache",
            "TIMEOUT": 300,
            "OPTIONS": {"MAX_ENTRIES": 1000},
        }
    }

# Celery settings (for async tasks)
# Celery: prefer explicit env vars, fall back to REDIS_URL if provided
CELERY_BROKER_URL = env(
    "CELERY_BROKER_URL", default=REDIS_URL or "rediss://localhost:6379/0"
)
CELERY_RESULT_BACKEND = env(
    "CELERY_RESULT_BACKEND", default=REDIS_URL or "rediss://localhost:6379/0"
)

# Sentry Configuration
SENTRY_DSN = env("SENTRY_DSN", default="")

if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[DjangoIntegration()],
            # Set traces_sample_rate to 1.0 to capture 100%
            # of transactions for performance monitoring.
            # We recommend adjusting this value in production:
            # lower to 0.05-0.1 for production to reduce costs.
            traces_sample_rate=0.1,
            # If you wish to associate users to errors (assuming you are using
            # django.contrib.auth) you may enable sending PII data.
            send_default_pii=False,  # Set to False in production to protect privacy
        )
    except ImportError:
        pass  # sentry_sdk not installed; error reporting disabled
