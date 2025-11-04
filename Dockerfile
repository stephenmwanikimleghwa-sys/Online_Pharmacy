## Multi-stage Dockerfile
# Stage 1: build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --silent
COPY frontend/ .
RUN npm run build

# Stage 2: python runtime
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system deps required by Pillow and building wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libxcb1-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source
COPY backend /app/backend

# Copy built frontend into backend static files
COPY --from=frontend-build /frontend/dist /app/backend/staticfiles/frontend

WORKDIR /app/backend

# Collect static files
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Use gunicorn to run the Django app
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
FROM node:18-alpine AS frontend

# Build React frontend
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

# Collect static (safe if no settings yet)
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Start Gunicorn (Render sets $PORT)
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
