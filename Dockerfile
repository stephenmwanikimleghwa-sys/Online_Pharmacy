# Build React frontend
FROM node:18-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production=false
COPY frontend/ .
RUN npm run build

# Backend stage
FROM python:3.11-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy built frontend into Django staticfiles directory
# Note: we place it under staticfiles/frontend so it's served by WhiteNoise
COPY --from=frontend /app/frontend/dist /app/staticfiles/frontend

# Collect static (requires a dummy SECRET_KEY to satisfy Django)
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput

EXPOSE 8000

# Run migrations and start Gunicorn on $PORT (or fallback to 8000)
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]
