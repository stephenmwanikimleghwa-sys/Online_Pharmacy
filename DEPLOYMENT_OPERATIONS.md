# Pharmacy Aggregator - Deployment & Setup Guide

## Quick Start for Production Deployment

### Prerequisites
- Render account with PostgreSQL database created
- Git repository with code pushed
- Environment variables configured

### Step 1: Seed Production Database

After Render deployment completes, seed the database with test data:

```bash
# Option A: Via Render dashboard shell
# 1. Go to your backend service in Render
# 2. Click "Shell" tab
# 3. Run:
DATABASE_URL="your_database_url" python manage.py shell < scripts/seed_data.py

# Option B: Locally pointing to production database
cd backend
source ../.venv/bin/activate
export DATABASE_URL="your_production_database_url"
python scripts/seed_data.py
```

### Step 2: Create Admin User

```bash
# Via Render shell or local terminal:
DATABASE_URL="your_production_database_url" python manage.py shell << EOF
from users.models import User, RoleChoices
user = User.objects.create_user(
    username="pharmacy_admin",
    password="SecurePassword123!",
    email="admin@pharmacy.com",
    role=RoleChoices.ADMIN,
    is_staff=True,
    is_superuser=True
)
print(f"Admin user created: {user.username}")
EOF
```

### Step 3: Verify Deployment

Run health checks:

```bash
# Test backend
curl https://your-backend-url/api/health/

# Test product API
curl https://your-backend-url/api/products/

# Test login
curl -X POST https://your-backend-url/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"pharmacy_admin","password":"SecurePassword123!"}'
```

### Step 4: Configure CORS (if needed)

Update `backend/config/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",
    "https://your-backend-domain.com",
]
```

Then commit and push:

```bash
git add backend/config/settings.py
git commit -m "Configure CORS for production domain"
git push origin main
```

---

## Running Automated Tests

Before deployments, run the full test suite:

```bash
cd backend
bash scripts/run_tests.sh
```

Or run individual test categories:

```bash
# Authentication tests
python manage.py test users.tests.test_user_auth

# Product tests
python manage.py test products.tests

# Order tests
python manage.py test orders.tests

# Critical flow tests
python manage.py test users.tests.test_critical_flows
```

---

## Database Management

### Backup Database

```bash
# From Render dashboard:
# 1. Go to PostgreSQL database
# 2. Click "Backups" tab
# 3. Click "Backup Now" for manual backup
# 4. View automatic daily backups
```

### Restore from Backup

```bash
# Contact Render support or use:
pg_restore -h your-host -U your-user -d your-db your-backup-file.dump
```

### Run Migrations

After code updates with model changes:

```bash
# Render will auto-run on deploy (via startCommand in render.yaml)
# Or manually:
DATABASE_URL="your_url" python manage.py migrate
```

---

## Monitoring & Logs

### View Render Logs

1. Go to Render dashboard
2. Select your service
3. Click "Logs" tab
4. Search for errors/warnings
5. Monitor for:
   - Database connection errors
   - Migration failures
   - Authentication issues
   - API 500 errors

### Common Issues & Solutions

**Issue**: "No such table: products_product"
- **Cause**: Migrations not run
- **Solution**: Run `python manage.py migrate --noinput`

**Issue**: "CORS policy: No 'Access-Control-Allow-Origin' header"
- **Cause**: Frontend domain not in CORS_ALLOWED_ORIGINS
- **Solution**: Update settings.py and redeploy

**Issue**: "DatabaseError: Connection refused"
- **Cause**: DATABASE_URL misconfigured or DB down
- **Solution**: Verify DATABASE_URL environment variable

**Issue**: "OperationalError: FATAL: too many connections"
- **Cause**: Connection pool exhausted
- **Solution**: Increase DB connections or reduce worker count

---

## Performance Tuning

### Database Optimization

```python
# In settings.py - Add connection pooling:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection persistence
    }
}

# Add query caching:
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Frontend Optimization

```bash
cd frontend
# Build optimized production bundle
npm run build

# Test build locally
npm preview
```

### API Optimization

```python
# Use select_related() for ForeignKey queries
products = Product.objects.select_related('pharmacy')

# Use prefetch_related() for reverse relations
orders = Order.objects.prefetch_related('items')

# Use only() to limit fields
products = Product.objects.only('id', 'name', 'price')
```

---

## Security Checklist

- [ ] DEBUG = False in production
- [ ] SECRET_KEY generated and unique
- [ ] ALLOWED_HOSTS configured correctly
- [ ] CSRF_TRUSTED_ORIGINS set for API domain
- [ ] HTTPS enforced (render.yaml)
- [ ] Database credentials never in code
- [ ] Environment variables used for secrets
- [ ] API keys stored in environment
- [ ] User passwords hashed (Django handles)
- [ ] JWT tokens expiring appropriately
- [ ] CORS properly configured (no wildcards)
- [ ] Admin site accessible only via auth

---

## Scaling for Growth

### When to Scale

**Indicators to monitor:**
- Response times > 2 seconds
- Database CPU usage > 70%
- Frequent "too many connections" errors
- 500 errors in logs
- Users reporting slowness

### Scaling Steps

1. **Upgrade Render plan**
   - From free → standard
   - Increase RAM/CPU
   - More concurrent connections

2. **Add caching layer**
   - Implement Redis via render.yaml
   - Cache product lists
   - Cache frequently accessed data

3. **Optimize queries**
   - Add database indexes
   - Use select_related/prefetch_related
   - Profile slow queries

4. **Use CDN for static files**
   - Move static files to CloudFront
   - Serve images from CDN
   - Reduce backend load

---

## Disaster Recovery

### If Database is Down

1. **Immediate actions:**
   ```bash
   # Check status
   curl https://your-backend/api/health/
   
   # View logs in Render
   # Contact Render support if persistence issue
   ```

2. **Restore from backup:**
   - Access Render dashboard → PostgreSQL → Backups
   - Restore latest backup
   - Run migrations again
   - Seed minimum required data

### If Frontend is Down

1. Check frontend service status in Render
2. Check build logs for errors
3. Verify `npm run build` succeeds locally
4. Redeploy from git:
   ```bash
   git push origin main  # Trigger redeploy
   ```

### If API is Down

1. View backend logs in Render
2. Check for database connectivity
3. Verify environment variables are set
4. Restart service or redeploy

---

## Maintenance Tasks

### Daily
- [ ] Monitor error logs
- [ ] Check for 500 errors
- [ ] Verify database is accessible

### Weekly
- [ ] Review usage metrics
- [ ] Check low-stock alerts
- [ ] Verify backups are running

### Monthly
- [ ] Review system performance
- [ ] Optimize slow queries
- [ ] Update dependencies (carefully)
- [ ] Full system test

### Quarterly
- [ ] Security audit
- [ ] Capacity planning
- [ ] Backup restoration test
- [ ] User feedback review

---

## Update & Patch Procedure

### Before Updating

1. Back up database
2. Run tests locally
3. Test on staging environment
4. Notify users of planned downtime
5. Schedule during low-traffic time

### During Update

1. Commit all changes:
   ```bash
   git add .
   git commit -m "Version update description"
   git push origin main
   ```

2. Monitor deployment in Render
3. Watch logs for errors
4. Test critical functionality

### After Update

1. Verify all services are healthy
2. Run full test suite
3. Check error logs
4. Notify users that system is back

### Database Migrations

If models changed:

```bash
# Create migrations
python manage.py makemigrations

# Test locally
python manage.py migrate

# Commit
git add backend/*/migrations/
git commit -m "Add migrations for [feature]"
git push
```

Render will auto-run during deployment.

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0 | 2026-03-02 | Initial release | Production |

---

## Emergency Contacts

- **Render Support**: dashboard.render.com → Help
- **Database Issues**: Render support team
- **Frontend Issues**: Check build logs in Render
- **Email Support**: support@transcountypharmacy.com

---

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Render Documentation](https://render.com/docs)
- [DRF Documentation](https://www.django-rest-framework.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

