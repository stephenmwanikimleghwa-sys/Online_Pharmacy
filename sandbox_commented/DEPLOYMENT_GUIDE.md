# # 🚀 Pharmacy Aggregator Deployment Guide
# 
# This comprehensive guide will help you deploy your Pharmacy Aggregator application to various hosting platforms for free.
# 
# ## 📋 Table of Contents
# 
# 1. [Prerequisites](#prerequisites)
# 2. [Recommended Free Hosting Platforms](#recommended-free-hosting-platforms)
# 3. [Local Deployment with Docker](#local-deployment-with-docker)
# 4. [Railway Deployment (Recommended)](#railway-deployment-recommended)
# 5. [Render Deployment](#render-deployment)
# 6. [Heroku Deployment](#heroku-deployment)
# 7. [Troubleshooting](#troubleshooting)
# 8. [Production Checklist](#production-checklist)
# 
# ## Prerequisites
# 
# Before deploying, ensure you have:
# 
# - ✅ Git installed
# - ✅ Docker and Docker Compose installed (for local testing)
# - ✅ A GitHub account
# - ✅ Basic knowledge of command line
# 
# ## 🏆 Recommended Free Hosting Platforms
# 
# ### 1. **Railway** (Best for Full-Stack Apps)
# - **Free Tier**: $5 credit monthly (enough for small apps)
# - **Features**: PostgreSQL, Redis, automatic deployments
# - **Pros**: Easy setup, great for Django + React
# - **Cons**: Limited free credits
# 
# ### 2. **Render** (Great Alternative)
# - **Free Tier**: 750 hours/month, sleeps after 15min inactivity
# - **Features**: PostgreSQL, Redis, automatic deployments
# - **Pros**: Generous free tier, easy setup
# - **Cons**: Apps sleep when inactive
# 
# ### 3. **Heroku** (Classic Choice)
# - **Free Tier**: Discontinued (paid plans only)
# - **Features**: PostgreSQL, Redis, extensive add-ons
# - **Pros**: Mature platform, great documentation
# - **Cons**: No longer free
# 
# ## 🐳 Local Deployment with Docker
# 
# Test your application locally before deploying:
# 
# ```bash
# # 1. Clone and navigate to your project
# cd pharmacy-aggregator
# 
# # 2. Copy environment file
# cp env.production .env
# # Edit .env with your configuration
# 
# # 3. Deploy locally
# ./deploy.sh local
# 
# # 4. Access your application
# # Frontend: http://localhost
# # Backend API: http://localhost/api
# # Admin: http://localhost/admin
# ```
# 
# ## 🚂 Railway Deployment (Recommended)
# 
# Railway is the best free option for your Django + React application.
# 
# ### Step 1: Prepare Your Application
# 
# ```bash
# # 1. Ensure all files are committed to Git
# git add .
# git commit -m "Prepare for Railway deployment"
# 
# # 2. Push to GitHub
# git push origin main
# ```
# 
# ### Step 2: Deploy to Railway
# 
# 1. **Sign up at [Railway.app](https://railway.app)**
# 2. **Connect your GitHub account**
# 3. **Create a new project**
# 4. **Add services:**
#    - **PostgreSQL Database**
#    - **Redis Cache**
#    - **Web Service** (from your GitHub repo)
# 
# ### Step 3: Configure Environment Variables
# 
# In Railway dashboard, add these environment variables:
# 
# ```env
# # Database (Railway will provide these)
# DATABASE_URL=postgresql://user:pass@host:port/dbname
# DB_NAME=railway
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=your_host
# DB_PORT=5432
# 
# # Security
# SECRET_KEY=your-very-secure-secret-key-here
# DEBUG=False
# ALLOWED_HOSTS=your-app.railway.app
# 
# # Redis (Railway will provide)
# REDIS_URL=redis://user:pass@host:port
# CELERY_BROKER_URL=redis://user:pass@host:port/0
# CELERY_RESULT_BACKEND=redis://user:pass@host:port/0
# ```
# 
# ### Step 4: Configure Railway Settings
# 
# Create `railway.json` in your project root:
# 
# ```json
# {
#   "build": {
#     "builder": "DOCKERFILE",
#     "dockerfilePath": "Dockerfile.railway"
#   },
#   "deploy": {
#     "startCommand": "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT",
#     "healthcheckPath": "/api/health/",
#     "healthcheckTimeout": 100,
#     "restartPolicyType": "ON_FAILURE",
#     "restartPolicyMaxRetries": 10
#   }
# }
# ```
# 
# ### Step 5: Deploy
# 
# Railway will automatically:
# 1. Build your application
# 2. Run database migrations
# 3. Collect static files
# 4. Start your application
# 
# Your app will be available at: `https://your-app.railway.app`
# 
# ## 🎨 Render Deployment
# 
# Render is another excellent free option with generous limits.
# 
# ### Step 1: Prepare for Render
# 
# ```bash
# # Use the deployment script
# ./deploy.sh render
# ```
# 
# ### Step 2: Deploy to Render
# 
# 1. **Sign up at [Render.com](https://render.com)**
# 2. **Connect your GitHub account**
# 3. **Create a new Web Service**
# 4. **Configure settings:**
#    - **Build Command**: `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build`
#    - **Start Command**: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
#    - **Environment**: Python 3.11
# 
# ### Step 3: Add Database
# 
# 1. **Create a PostgreSQL database**
# 2. **Add environment variables** (Render will provide connection details)
# 
# ### Step 4: Configure Environment
# 
# ```env
# # Database (Render provides these)
# DATABASE_URL=postgresql://user:pass@host:port/dbname
# 
# # Security
# SECRET_KEY=your-secure-secret-key
# DEBUG=False
# ALLOWED_HOSTS=your-app.onrender.com
# 
# # Redis (optional)
# REDIS_URL=redis://user:pass@host:port
# ```
# 
# ## 🟣 Heroku Deployment
# 
# While Heroku no longer offers a free tier, here's how to deploy if you have a paid account:
# 
# ### Step 1: Prepare for Heroku
# 
# ```bash
# # Use the deployment script
# ./deploy.sh heroku
# ```
# 
# ### Step 2: Deploy to Heroku
# 
# ```bash
# # 1. Install Heroku CLI
# # Visit: https://devcenter.heroku.com/articles/heroku-cli
# 
# # 2. Login to Heroku
# heroku login
# 
# # 3. Create Heroku app
# heroku create your-app-name
# 
# # 4. Add PostgreSQL
# heroku addons:create heroku-postgresql:hobby-dev
# 
# # 5. Add Redis
# heroku addons:create heroku-redis:hobby-dev
# 
# # 6. Set environment variables
# heroku config:set SECRET_KEY=your-secret-key
# heroku config:set DEBUG=False
# heroku config:set ALLOWED_HOSTS=your-app.herokuapp.com
# 
# # 7. Deploy
# git push heroku main
# 
# # 8. Run migrations
# heroku run python manage.py migrate
# 
# # 9. Create superuser
# heroku run python manage.py createsuperuser
# ```
# 
# ## 🔧 Troubleshooting
# 
# ### Common Issues
# 
# **1. Database Connection Error**
# ```bash
# # Check database URL format
# echo $DATABASE_URL
# # Should be: postgresql://user:pass@host:port/dbname
# ```
# 
# **2. Static Files Not Loading**
# ```bash
# # Ensure static files are collected
# python manage.py collectstatic --noinput
# ```
# 
# **3. CORS Issues**
# ```python
# # In settings.py, add your domain to CORS_ALLOWED_ORIGINS
# CORS_ALLOWED_ORIGINS = [
#     "https://your-app.railway.app",
#     "https://your-app.onrender.com",
# ]
# ```
# 
# **4. Environment Variables Not Loading**
# ```bash
# # Check if .env file exists and has correct format
# cat .env
# ```
# 
# ### Debug Commands
# 
# ```bash
# # Check application logs
# railway logs
# # or
# render logs
# 
# # Check database connection
# python manage.py dbshell
# 
# # Check Redis connection
# python manage.py shell
# >>> from django.core.cache import cache
# >>> cache.set('test', 'value')
# >>> cache.get('test')
# ```
# 
# ## ✅ Production Checklist
# 
# Before going live, ensure:
# 
# ### Security
# - [ ] `DEBUG=False` in production
# - [ ] Strong `SECRET_KEY` set
# - [ ] `ALLOWED_HOSTS` configured
# - [ ] HTTPS enabled (automatic on Railway/Render)
# - [ ] Environment variables secured
# 
# ### Database
# - [ ] Database migrations run
# - [ ] Superuser created
# - [ ] Database backed up
# 
# ### Application
# - [ ] Static files collected
# - [ ] Media files configured
# - [ ] Email settings configured (if needed)
# - [ ] Payment settings configured (if needed)
# 
# ### Monitoring
# - [ ] Health check endpoint working
# - [ ] Logging configured
# - [ ] Error tracking set up (optional)
# 
# ## 🎯 Quick Start Commands
# 
# ```bash
# # Local development
# ./deploy.sh local
# 
# # Railway deployment
# ./deploy.sh railway
# 
# # Render deployment
# ./deploy.sh render
# 
# # Heroku deployment
# ./deploy.sh heroku
# ```
# 
# ## 📞 Support
# 
# If you encounter issues:
# 
# 1. **Check the logs** in your hosting platform dashboard
# 2. **Verify environment variables** are set correctly
# 3. **Test locally** with Docker first
# 4. **Check the troubleshooting section** above
# 
# ## 🎉 Success!
# 
# Once deployed, your Pharmacy Aggregator will be available at:
# - **Frontend**: Your hosting platform URL
# - **API**: Your hosting platform URL + `/api`
# - **Admin**: Your hosting platform URL + `/admin`
# 
# Congratulations! Your pharmacy management system is now live! 🏥✨
