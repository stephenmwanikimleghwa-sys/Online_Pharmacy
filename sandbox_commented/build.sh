# #!/bin/bash
# 
# # Build script for Render deployment
# set -e
# 
# echo "🚀 Building Pharmacy Aggregator for Render..."
# 
# # Install Python dependencies
# echo "📦 Installing Python dependencies..."
# pip install -r backend/requirements.txt
# 
# # Install Node.js dependencies and build frontend
# echo "📦 Installing Node.js dependencies..."
# cd frontend
# npm install
# 
# echo "🔨 Building React frontend..."
# npm run build
# 
# # Copy frontend build to backend static files
# echo "📁 Copying frontend build to backend..."
# cp -r dist/* ../backend/staticfiles/frontend/
# 
# cd ..
# 
# # Collect Django static files
# echo "📁 Collecting Django static files..."
# cd backend
# python manage.py collectstatic --noinput
# 
# echo "✅ Build complete!"
