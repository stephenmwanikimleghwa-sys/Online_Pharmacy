# # 🏥 Transcounty Pharmacy Aggregator
# 
# A comprehensive pharmacy management system built with Django REST Framework and React, designed to streamline prescription management, inventory tracking, and order processing for pharmacies in Kenya.
# 
# ##  Features
# 
# ### For Customers
# - **Product Discovery**: Browse and search pharmaceutical products
# - **Prescription Upload**: Upload prescriptions for validation and processing
# - **Order Management**: Track orders from prescription to delivery
# - **User Account**: Manage profile and order history
# - **Cart & Checkout**: Secure shopping cart with multiple payment options
# 
# ### For Pharmacists
# - **Prescription Management**: Validate and process customer prescriptions
# - **Inventory Control**: Real-time stock monitoring and management
# - **Order Processing**: Dispense medications and manage deliveries
# - **Dashboard**: Comprehensive analytics and reporting
# - **Stock Alerts**: Automated low-stock notifications
# 
# ### For Administrators
# - **User Management**: Manage customers, pharmacists, and staff
# - **System Analytics**: Business intelligence and reporting
# - **Inventory Oversight**: Monitor stock levels across all products
# - **Financial Reports**: Revenue tracking and analysis
# 
# ## 🛠️ Tech Stack
# 
# ### Backend
# - **Django 4.2+** - Web framework
# - **Django REST Framework** - API development
# - **PostgreSQL** - Primary database
# - **Redis** - Caching and task queue
# - **Celery** - Asynchronous task processing
# - **JWT Authentication** - Secure API access
# - **Stripe & M-Pesa** - Payment processing
# 
# ### Frontend
# - **React 18** - UI framework
# - **Vite** - Build tool
# - **Tailwind CSS** - Styling
# - **React Router** - Navigation
# - **Axios** - HTTP client
# - **React Query** - Data fetching
# - **Recharts** - Data visualization
# 
# ### DevOps
# - **Docker** - Containerization
# - **Docker Compose** - Multi-container orchestration
# - **Nginx** - Web server (production)
# - **Gunicorn** - WSGI server
# 
# ## 🚀 Quick Start
# 
# ### Prerequisites
# - Python 3.8+
# - Node.js 16+
# - PostgreSQL 12+
# - Redis 6+
# - Git
# 
# ### Installation
# 
# 1. **Clone the repository**
#    ```bash
#    git clone https://github.com/yourusername/pharmacy-aggregator.git
#    cd pharmacy-aggregator
#    ```
# 
# 2. **Backend Setup**
#    ```bash
#    # Navigate to backend directory
#    cd backend
#    
#    # Create virtual environment
#    python -m venv venv
#    source venv/bin/activate  # On Windows: venv\Scripts\activate
#    
#    # Install dependencies
#    pip install -r requirements.txt
#    
#    # Copy environment variables
#    cp env.example .env
#    # Edit .env with your configuration
#    
#    # Run migrations
#    python manage.py makemigrations
#    python manage.py migrate
#    
#    # Create superuser
#    python manage.py createsuperuser
#    
#    # Start development server
#    python manage.py runserver
#    ```
# 
# 3. **Frontend Setup**
#    ```bash
#    # Navigate to frontend directory
#    cd frontend
#    
#    # Install dependencies
#    npm install
#    
#    # Start development server
#    npm run dev
#    ```
# 
# 4. **Database Setup**
#    ```bash
#    # Create PostgreSQL database
#    createdb transcounty_pharmacy
#    
#    # Run migrations
#    python manage.py migrate
#    ```
# 
# ### Docker Setup (Alternative)
# 
# ```bash
# # Build and start all services
# docker-compose up --build
# 
# # Run in background
# docker-compose up -d
# ```
# 
# ## 📁 Project Structure
# 
# ```
# pharmacy-aggregator/
# ├── backend/                 # Django backend
# │   ├── config/             # Django settings
# │   ├── users/              # User management
# │   ├── products/           # Product catalog
# │   ├── prescriptions/      # Prescription handling
# │   ├── orders/             # Order management
# │   ├── inventory/          # Stock management
# │   ├── payments/           # Payment processing
# │   ├── reports/            # Analytics & reporting
# │   └── requirements.txt    # Python dependencies
# ├── frontend/               # React frontend
# │   ├── src/
# │   │   ├── components/     # Reusable components
# │   │   ├── pages/         # Page components
# │   │   ├── services/      # API services
# │   │   ├── context/       # React context
# │   │   └── utils/         # Utility functions
# │   └── package.json       # Node dependencies
# ├── docker/                # Docker configurations
# ├── docs/                  # Documentation
# └── README.md              # This file
# ```
# 
# ## 🔧 Configuration
# 
# ### Environment Variables
# 
# Create a `.env` file in the backend directory with the following variables:
# 
# ```env
# # Database
# DB_NAME=transcounty_pharmacy
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432
# 
# # Security
# SECRET_KEY=your-secret-key-here
# DEBUG=True
# 
# # Email (Optional)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-email@gmail.com
# EMAIL_HOST_PASSWORD=your-app-password
# 
# # AWS S3 (Optional)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_STORAGE_BUCKET_NAME=your-bucket-name
# 
# # Payments (Optional)
# STRIPE_SECRET_KEY=sk_test_your-stripe-key
# STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key
# 
# # M-Pesa (Optional)
# MPESA_CONSUMER_KEY=your-mpesa-key
# MPESA_CONSUMER_SECRET=your-mpesa-secret
# MPESA_SHORTCODE=your-shortcode
# MPESA_PASSKEY=your-passkey
# ```
# 
# ## 🧪 Testing
# 
# ### Backend Tests
# ```bash
# cd backend
# python manage.py test
# ```
# 
# ### Frontend Tests
# ```bash
# cd frontend
# npm test
# ```
# 
# ### API Testing
# ```bash
# # Install HTTPie for API testing
# pip install httpie
# 
# # Test API endpoints
# http GET localhost:8000/api/products/
# http POST localhost:8000/api/auth/login/ username=test password=test
# ```
# 
# ## 📊 API Documentation
# 
# Once the server is running, visit:
# - **Swagger UI**: `http://localhost:8000/swagger/`
# - **ReDoc**: `http://localhost:8000/redoc/`
# 
# ### Key API Endpoints
# 
# - `GET /api/products/` - List products
# - `POST /api/prescriptions/` - Upload prescription
# - `GET /api/inventory/` - Inventory management
# - `POST /api/orders/` - Create order
# - `GET /api/reports/` - Analytics data
# 
# ## 👥 User Roles
# 
# ### Customer
# - Browse and search products
# - Upload prescriptions
# - Place orders
# - Track order status
# 
# ### Pharmacist
# - Validate prescriptions
# - Manage inventory
# - Process orders
# - View analytics
# 
# ### Admin
# - User management
# - System configuration
# - Financial reports
# - Global analytics
# 
# ## 🔒 Security Features
# 
# - **JWT Authentication** - Secure API access
# - **Role-based Permissions** - Granular access control
# - **CORS Protection** - Cross-origin request security
# - **Rate Limiting** - API abuse prevention
# - **Input Validation** - Data sanitization
# - **HTTPS Ready** - SSL/TLS configuration
# 
# ## 🚀 Deployment
# 
# ### Production Checklist
# 
# - [ ] Set `DEBUG=False`
# - [ ] Configure production database
# - [ ] Set up Redis for caching
# - [ ] Configure email settings
# - [ ] Set up file storage (AWS S3)
# - [ ] Configure domain and SSL
# - [ ] Set up monitoring and logging
# - [ ] Configure backup strategy
# 
# ### Environment Setup
# 
# ```bash
# # Production environment variables
# DEBUG=False
# ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
# SECRET_KEY=your-production-secret-key
# DB_HOST=your-production-db-host
# ```
# 
# ## 🤝 Contributing
# 
# 1. Fork the repository
# 2. Create a feature branch (`git checkout -b feature/amazing-feature`)
# 3. Commit your changes (`git commit -m 'Add amazing feature'`)
# 4. Push to the branch (`git push origin feature/amazing-feature`)
# 5. Open a Pull Request
# 
# ### Development Guidelines
# 
# - Follow PEP 8 for Python code
# - Use ESLint for JavaScript/React code
# - Write tests for new features
# - Update documentation as needed
# - Follow conventional commit messages
# 
# ## 📝 License
# 
# This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
# 
# ## 🆘 Support
# 
# ### Common Issues
# 
# **Database Connection Error**
# ```bash
# # Ensure PostgreSQL is running
# sudo service postgresql start
# 
# # Check database exists
# psql -l | grep transcounty_pharmacy
# ```
# 
# **Frontend Build Issues**
# ```bash
# # Clear node modules and reinstall
# rm -rf node_modules package-lock.json
# npm install
# ```
# 
# **Redis Connection Error**
# ```bash
# # Start Redis server
# redis-server
# 
# # Test connection
# redis-cli ping
# ```
# 
# ### Getting Help
# 
# - 📧 Email: stephenmwanikimleghwa@gmail.com
# - 💬 Discord: [Join our community](https://discord.gg/your-invite)
# - 📖 Documentation: [Wiki](https://github.com/StephenNafula/pharmacy-aggregator/wiki)
# - 🐛 Issues: [GitHub Issues](https://github.com/StephenNafula/pharmacy-aggregator/issues)
# 
# ## 🎯 Roadmap
# 
# ### Phase 1 (Current)
# - [x] Basic prescription management
# - [x] Inventory tracking
# - [x] User authentication
# - [x] Order processing
# 
# ### Phase 2 (Next)
# - [ ] Mobile app (React Native)
# - [ ] Advanced analytics
# - [ ] Multi-pharmacy support
# - [ ] API integrations
# 
# ### Phase 3 (Future)
# - [ ] AI-powered recommendations
# - [ ] Blockchain prescription verification
# - [ ] IoT device integration
# - [ ] Telemedicine features
# 
# ## 🙏 Acknowledgments
# 
# - Django community for the excellent framework
# - React team for the amazing UI library
# - Tailwind CSS for the utility-first approach
# - All contributors and testers
# 
# ---
# 
# **Made with ❤️ for healthcare in Kenya**
