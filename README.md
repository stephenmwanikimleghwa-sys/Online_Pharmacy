# 🏥 Transcounty Pharmacy Aggregator

A comprehensive pharmacy management system built with Django REST Framework and React, designed to streamline prescription management, inventory tracking, and order processing for pharmacies in Kenya.

##  Features

### For Pharmacists
- **Prescription Management**: Digitally record and verify physical patient prescriptions
- **Inventory Control**: Real-time stock monitoring and batch-level tracking
- **Direct Dispensing**: Efficiently dispense medications to walk-in customers
- **Stock Alerts**: Automated low-stock notifications for critical drugs
- **Internal Logs**: Automated generation of dispensing logs for compliance

### For Administrators
- **User Management**: Manage pharmacists, staff, and system access levels
- **System Analytics**: Business intelligence and financial reporting dashboards
- **Inventory Oversight**: Monitor stock levels across all aggregated pharmacies
- **Financial Reports**: Track revenue and sales trends across shifts

## 🛠️ Tech Stack

### Backend
- **Django 4.2+** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Primary database
- **Redis** - Caching and task queue
- **Celery** - Asynchronous task processing
- **JWT Authentication** - Secure API access
- **Stripe & M-Pesa** - Payment processing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Query** - Data fetching
- **Recharts** - Data visualization

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server (production)
- **Gunicorn** - WSGI server

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pharmacy-aggregator.git
   cd pharmacy-aggregator
   ```

2. **Backend Setup**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy environment variables
   cp env.example .env
   # Edit .env with your configuration
   
   # Run migrations
   python manage.py makemigrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   
   # Start development server
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb transcounty_pharmacy
   
   # Run migrations
   python manage.py migrate
   ```

### Docker Setup (Alternative)

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d
```

## 📁 Project Structure

```
pharmacy-aggregator/
├── backend/                 # Django backend
│   ├── config/             # Django settings
│   ├── users/              # User management
│   ├── products/           # Product catalog
│   ├── prescriptions/      # Prescription handling
│   ├── orders/             # Order management
│   ├── inventory/          # Stock management
│   ├── payments/           # Payment processing
│   ├── reports/            # Analytics & reporting
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React context
│   │   └── utils/         # Utility functions
│   └── package.json       # Node dependencies
├── docker/                # Docker configurations
├── docs/                  # Documentation
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DB_NAME=transcounty_pharmacy
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Security
SECRET_KEY=your-secret-key-here
DEBUG=True

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name

# Payments (Optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# M-Pesa (Optional)
MPESA_CONSUMER_KEY=your-mpesa-key
MPESA_CONSUMER_SECRET=your-mpesa-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing
```bash
# Install HTTPie for API testing
pip install httpie

# Test API endpoints
http GET localhost:8000/api/products/
http POST localhost:8000/api/auth/login/ username=test password=test
```

## 📊 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:8000/swagger/`
- **ReDoc**: `http://localhost:8000/redoc/`

### Key API Endpoints

- `GET /api/products/` - List products
- `POST /api/prescriptions/` - Upload prescription
- `GET /api/inventory/` - Inventory management
- `POST /api/orders/` - Create order
- `GET /api/reports/` - Analytics data

## 👥 User Roles

### Pharmacist
- Digitally enter walk-in prescriptions
- Manage local inventory and batch tracking
- Process dispensing actions
- View branch-specific analytics

### Admin
- User and role management
- System-wide configuration
- Comprehensive financial and stock reports
- Global analytics across all pharmacies

## 🔒 Security Features

- **JWT Authentication** - Secure internal API access
- **Role-based Permissions** - Granular control (e.g., only Pharmacists can dispense)
- **CORS Protection** - Cross-origin request security
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Data sanitization for drug entry
- **HTTPS Ready** - SSL/TLS configuration

## 🚀 Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Configure production database
- [ ] Set up Redis for caching
- [ ] Configure email settings
- [ ] Set up file storage (AWS S3)
- [ ] Configure domain and SSL
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Environment Setup

```bash
# Production environment variables
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECRET_KEY=your-production-secret-key
DB_HOST=your-production-db-host
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use ESLint for JavaScript/React code
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Error**
```bash
# Ensure PostgreSQL is running
sudo service postgresql start

# Check database exists
psql -l | grep transcounty_pharmacy
```

**Frontend Build Issues**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Redis Connection Error**
```bash
# Start Redis server
redis-server

# Test connection
redis-cli ping
```

### Getting Help

- 📧 Email: stephenmwanikimleghwa@gmail.com
- 💬 Discord: [Join our community](https://discord.gg/your-invite)
- 📖 Documentation: [Wiki](https://github.com/StephenNafula/pharmacy-aggregator/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/StephenNafula/pharmacy-aggregator/issues)

## Caching strategy

### Frontend (React Query)
- Shared `queryClient` with 5 min default stale time, 30 min GC
- Session persistence via `sessionStorage` (`TRANSCOUNTY_QUERY_CACHE`)
- Bump `VITE_APP_VERSION` on each production deploy to bust stale cache
- Prefetch on login / branch selection and sidebar hover for hot routes
- See `frontend/src/lib/queryKeys.ts` and `frontend/src/hooks/` for hook inventory

### Backend (Django)
- LocMem cache by default (`transcounty-cache`); Redis when `REDIS_URL` is set
- Dashboard endpoints cached 60s; invalidated on stock intake, dispensation, supplier save
- `backend/utils/cached_view.py` for additional endpoint caching

Full cleanup details: [CLEANUP_REPORT.md](./CLEANUP_REPORT.md)  
Outstanding work: [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)

## 🎯 Roadmap

### Phase 1 (Completed)
- [x] Internal prescription management (Pharmacist-led)
- [x] Inventory & Batch tracking
- [x] Internal User authentication (Admin/Pharmacist)
- [x] Direct dispensing & Logging

### Phase 2 (Current)
- [x] Advanced analytics & Financial reporting
- [x] Multi-pharmacy internal support
- [x] Database optimization & Caching
- [x] Security enhancements for internal endpoints

### Phase 3 (Future)
- [ ] Patient Self-Service Portal & Mobile App
- [ ] AI-powered inventory forecasting
- [ ] Blockchain prescription verification
- [ ] Telemedicine features
- [ ] IoT device integration

## 🙏 Acknowledgments

- Django community for the excellent framework
- React team for the amazing UI library
- Tailwind CSS for the utility-first approach
- All contributors and testers

---

**Made with ❤️ for healthcare in Kenya**