# #!/bin/bash
# 
# # Pharmacy Aggregator Deployment Script
# # This script helps deploy the application to various hosting platforms
# 
# set -e
# 
# # Colors for output
# RED='\033[0;31m'
# GREEN='\033[0;32m'
# YELLOW='\033[1;33m'
# BLUE='\033[0;34m'
# NC='\033[0m' # No Color
# 
# # Function to print colored output
# print_status() {
#     echo -e "${BLUE}[INFO]${NC} $1"
# }
# 
# print_success() {
#     echo -e "${GREEN}[SUCCESS]${NC} $1"
# }
# 
# print_warning() {
#     echo -e "${YELLOW}[WARNING]${NC} $1"
# }
# 
# print_error() {
#     echo -e "${RED}[ERROR]${NC} $1"
# }
# 
# # Function to check if command exists
# command_exists() {
#     command -v "$1" >/dev/null 2>&1
# }
# 
# # Function to check prerequisites
# check_prerequisites() {
#     print_status "Checking prerequisites..."
#     
#     if ! command_exists docker; then
#         print_error "Docker is not installed. Please install Docker first."
#         exit 1
#     fi
#     
#     if ! command_exists docker-compose; then
#         print_error "Docker Compose is not installed. Please install Docker Compose first."
#         exit 1
#     fi
#     
#     print_success "All prerequisites are met!"
# }
# 
# # Function to setup environment
# setup_environment() {
#     print_status "Setting up environment..."
#     
#     if [ ! -f .env ]; then
#         if [ -f env.production ]; then
#             print_status "Copying production environment template..."
#             cp env.production .env
#             print_warning "Please edit .env file with your actual configuration values!"
#         else
#             print_error "No environment file found. Please create .env file."
#             exit 1
#         fi
#     fi
#     
#     print_success "Environment setup complete!"
# }
# 
# # Function to build and start services
# deploy_local() {
#     print_status "Deploying locally with Docker Compose..."
#     
#     # Stop any existing containers
#     docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
#     
#     # Build and start services
#     docker-compose -f docker-compose.prod.yml up --build -d
#     
#     print_success "Local deployment complete!"
#     print_status "Your application should be available at:"
#     echo "  - Frontend: http://localhost"
#     echo "  - Backend API: http://localhost/api"
#     echo "  - Admin Panel: http://localhost/admin"
# }
# 
# # Function to deploy to Heroku
# deploy_heroku() {
#     print_status "Preparing for Heroku deployment..."
#     
#     if ! command_exists heroku; then
#         print_error "Heroku CLI is not installed. Please install it first."
#         print_status "Visit: https://devcenter.heroku.com/articles/heroku-cli"
#         exit 1
#     fi
#     
#     # Create Procfile for Heroku
#     cat > Procfile << EOF
# web: gunicorn config.wsgi:application --bind 0.0.0.0:\$PORT
# worker: celery -A config worker -l info
# beat: celery -A config beat -l info
# EOF
#     
#     # Create runtime.txt
#     echo "python-3.11.0" > runtime.txt
#     
#     print_success "Heroku configuration files created!"
#     print_status "Next steps:"
#     echo "1. Create a new Heroku app: heroku create your-app-name"
#     echo "2. Add PostgreSQL addon: heroku addons:create heroku-postgresql:hobby-dev"
#     echo "3. Add Redis addon: heroku addons:create heroku-redis:hobby-dev"
#     echo "4. Set environment variables: heroku config:set SECRET_KEY=your-secret-key"
#     echo "5. Deploy: git push heroku main"
# }
# 
# # Function to deploy to Railway
# deploy_railway() {
#     print_status "Preparing for Railway deployment..."
#     
#     # Create railway.json
#     cat > railway.json << EOF
# {
#   "build": {
#     "builder": "DOCKERFILE",
#     "dockerfilePath": "Dockerfile.railway"
#   },
#   "deploy": {
#     "startCommand": "gunicorn config.wsgi:application --bind 0.0.0.0:\$PORT",
#     "healthcheckPath": "/api/health/",
#     "healthcheckTimeout": 100,
#     "restartPolicyType": "ON_FAILURE",
#     "restartPolicyMaxRetries": 10
#   }
# }
# EOF
#     
#     # Create Dockerfile for Railway
#     cat > Dockerfile.railway << EOF
# FROM python:3.11-slim
# 
# # Set environment variables
# ENV PYTHONDONTWRITEBYTECODE=1
# ENV PYTHONUNBUFFERED=1
# 
# # Set work directory
# WORKDIR /app
# 
# # Install system dependencies
# RUN apt-get update \\
#     && apt-get install -y --no-install-recommends \\
#         gcc \\
#         postgresql-client \\
#         libpq-dev \\
#         curl \\
#     && rm -rf /var/lib/apt/lists/*
# 
# # Install Python dependencies
# COPY backend/requirements.txt .
# RUN pip install --no-cache-dir --upgrade pip && \\
#     pip install --no-cache-dir -r requirements.txt
# 
# # Copy project
# COPY backend/ .
# 
# # Collect static files
# RUN python manage.py collectstatic --noinput
# 
# # Expose port
# EXPOSE 8000
# 
# # Run the application
# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "config.wsgi:application"]
# EOF
#     
#     print_success "Railway configuration files created!"
#     print_status "Next steps:"
#     echo "1. Install Railway CLI: npm install -g @railway/cli"
#     echo "2. Login: railway login"
#     echo "3. Initialize: railway init"
#     echo "4. Add PostgreSQL service: railway add postgresql"
#     echo "5. Deploy: railway up"
# }
# 
# # Function to show help
# show_help() {
#     echo "Pharmacy Aggregator Deployment Script"
#     echo ""
#     echo "Usage: $0 [OPTION]"
#     echo ""
#     echo "Options:"
#     echo "  local       Deploy locally with Docker Compose"
#     echo "  heroku      Prepare for Heroku deployment"
#     echo "  railway     Prepare for Railway deployment"
#     echo "  help        Show this help message"
#     echo ""
#     echo "Examples:"
#     echo "  $0 local"
#     echo "  $0 heroku"
#     echo "  $0 railway"
# }
# 
# # Main script logic
# main() {
#     case "${1:-help}" in
#         "local")
#             check_prerequisites
#             setup_environment
#             deploy_local
#             ;;
#         "heroku")
#             deploy_heroku
#             ;;
#         "railway")
#             deploy_railway
#             ;;
#         "help"|*)
#             show_help
#             ;;
#     esac
# }
# 
# # Run main function with all arguments
# main "$@"
