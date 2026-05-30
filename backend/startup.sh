#!/bin/bash
set -e

echo "=== START: running migrate ==="
python manage.py migrate --noinput --verbosity 2
echo "=== MIGRATE COMPLETE ==="

echo "=== START: collectstatic ==="
python manage.py collectstatic --noinput --verbosity 1
echo "=== COLLECTSTATIC COMPLETE ==="

echo "=== Starting gunicorn ==="
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
