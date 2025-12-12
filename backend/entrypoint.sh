#!/bin/sh

# Wait for database if needed (optional, but good practice)
# /app/wait-for-it.sh db:5432 --

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting server..."
exec "$@"
