#!/bin/bash
# Startup script for Render deployment
# Runs migrations before starting gunicorn so the DB schema is always up-to-date.
# Uses 'set -e' so any failure causes a non-zero exit, which Render treats as a
# failed deployment and keeps the old healthy instance running.

set -e

echo "============================================"
echo " Pharmacy Aggregator — Container Startup"
echo "============================================"

echo ""
echo ">>> [1/3] Running database migrations..."
python manage.py migrate --noinput --verbosity 2
echo ">>> [1/3] Migrations complete."

echo ""
echo ">>> [2/3] Collecting static files..."
python manage.py collectstatic --noinput --verbosity 1
echo ">>> [2/3] Static files collected."

echo ""
echo ">>> [3/3] Starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${PORT:-8000}" \
    --workers 3 \
    --timeout 120 \
    --log-level info \
    --access-logfile - \
    --error-logfile -
