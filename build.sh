#!/bin/bash

# Build script for Render deployment
set -e

echo "🚀 Building Pharmacy Aggregator for Render..."

# Install system dependencies if apt-packages exists
if [ -f apt-packages ]; then
	echo "📦 Installing system dependencies..."
	apt-get update -qq
	apt-get install -y $(cat apt-packages)
fi

# Upgrade pip and install build tools
pip install --upgrade pip setuptools wheel build

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt

# Install Node.js dependencies and build frontend
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install

echo "🔨 Building React frontend..."
npm run build

# Copy frontend build to backend static files
echo "📁 Copying frontend build to backend..."
cp -r dist/* ../backend/staticfiles/frontend/

cd ..

# Collect Django static files
echo "📁 Collecting Django static files..."
cd backend
python manage.py collectstatic --noinput

echo "✅ Build complete!"
