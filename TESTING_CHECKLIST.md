# Pharmacy Aggregator - Testing Checklist

This document provides a comprehensive testing checklist to ensure the pharmacy system is production-ready before deployment to a real pharmacy.

## Pre-Testing Setup

- [ ] Database seeded with test data using `scripts/seed_data.py`
- [ ] Test users created: admin_user, pharmacist_jane, cashier_bob, customer_alice
- [ ] Frontend build is up-to-date (`npm run build`)
- [ ] Backend is running on local or staging environment
- [ ] Test environment has same configuration as production

---

##  1. Authentication & Authorization

### Login Functionality
- [ ] User can log in with valid credentials
- [ ] User cannot log in with wrong password
- [ ] User cannot log in with non-existent username
- [ ] Error messages are clear and helpful
- [ ] JWT tokens are generated on successful login
- [ ] Token is stored in localStorage
- [ ] User session persists after page refresh
- [ ] User is redirected to dashboard after login

### Role-Based Access Control
- [ ] Admin user can access admin dashboard
- [ ] Pharmacist cannot access admin functions
- [ ] Cashier cannot access inventory management
- [ ] Customer cannot see employee-only features
- [ ] Logout clears token and user data
- [ ] Protected routes redirect to login when unauthenticated
- [ ] 403 errors shown for unauthorized access attempts

### Password Management
- [ ] User can change password
- [ ] Old password must be verified
- [ ] New password must meet validation requirements
- [ ] Password reset flow works (if implemented)
- [ ] Passwords are never visible in logs or API responses

---

## 2. Product Management

### View Products
- [ ] Product list loads correctly
- [ ] Products display correct information (name, price, stock)
- [ ] Price displays in proper currency format (KES)
- [ ] Stock quantity updates reflect in UI
- [ ] Search products by name works
- [ ] Filter by category works
- [ ] Sort by price/name works
- [ ] Pagination works for large product lists

### Create Products
- [ ] Admin/Pharmacist can add new products
- [ ] All required fields must be provided
- [ ] Price validation (non-negative, decimal format)
- [ ] Stock quantity must be non-negative
- [ ] Dosage form options display correctly
- [ ] Manufacturer and strength fields are optional
- [ ] Image upload works
- [ ] Duplicate product names are allowed (different categories)
- [ ] Success message shown after creation

### Edit Products
- [ ] Admin/Pharmacist can edit existing products
- [ ] Cannot edit another pharmacy's products
- [ ] Formula price fields update correctly
- [ ] Stock quantity can be adjusted up or down
- [ ] Featured flag can be toggled
- [ ] Active/Inactive toggle works
- [ ] Changes save immediately
- [ ] Edited products appear in search results

### Delete Products
- [ ] Admin can delete products
- [ ] Pharmacist cannot delete products
- [ ] Confirmation dialog appears before deletion
- [ ] Deleted products no longer appear in list
- [ ] Cannot delete non-existent products
- [ ] Proper error message if deletion fails

### Featured Products
- [ ] Featured products appear on home page
- [ ] Only 6 featured products max display on homepage
- [ ] Non-featured products don't appear in featured section
- [ ] Admin can mark products as featured
- [ ] Featured status can be toggled on/off

---

## 3. Inventory Management

### Stock Levels
- [ ] Current stock displays accurately
- [ ] Low stock threshold can be configured
- [ ] Low stock items are flagged in UI
- [ ] Cannot process order for out-of-stock items
- [ ] Stock levels update after order completion

### Reorder Management
- [ ] Reorder threshold is configurable per product
- [ ] Low-stock alert shows for items below threshold
- [ ] Report shows items needing reorders
- [ ] Upcoming expiry items are flagged
- [ ] Supplier information displays correctly

### Stock Adjustments
- [ ] Can manually adjust stock (receive goods, corrections)
- [ ] Adjustment history is logged
- [ ] Stock cannot go negative
- [ ] Reason for adjustment can be documented

---

## 4. Orders

### Create Orders
- [ ] Customer can create new order
- [ ] Can add multiple products to order
- [ ] Quantity validation prevents invalid numbers
- [ ] Cannot order out-of-stock items
- [ ] Order total calculates correctly
- [ ] Tax is applied (if applicable)
- [ ] Discount codes work (if implemented)
- [ ] Order confirmation email sent (if applicable)

### View Orders
- [ ] Customer sees only their orders
- [ ] Admin/Pharmacist sees all orders
- [ ] Orders display status (pending, approved, completed, cancelled)
- [ ] Order details show all items and prices
- [ ] Timestamp shows when order was placed
- [ ] Filter orders by status works
- [ ] Filter orders by date range works

### Update Order Status
- [ ] Pharmacist can update order status
- [ ] Status flow is correct: pending → approved → completed
- [ ] Cannot skip status steps
- [ ] Inventory decreases when order is approved
- [ ] Customer notified of status changes (if applicable)
- [ ] Cancelled orders return stock to inventory

### Order Timeline
- [ ] Order history shows all status changes
- [ ] Timestamps are accurate
- [ ] User who made change is recorded

---

## 5. Payments

### Payment Processing
- [ ] Payment form accepts valid card details
- [ ] Invalid card details are rejected
- [ ] Transaction amount matches order total
- [ ] Payment processing shows loading state
- [ ] Successful payment completes order
- [ ] Failed payment shows error message
- [ ] Invoice generated after payment

### Payment Records
- [ ] All payments are logged
- [ ] Payment method is recorded (cash, card, M-Pesa, etc.)
- [ ] Transaction ID is stored
- [ ] Payment status is tracked
- [ ] Cannot resubmit payment for completed order

---

## 6. Reports & Analytics

### Sales Reports
- [ ] Daily sales report generates correctly
- [ ] Weekly sales summary aggregates properly
- [ ] Monthly revenue calculation is accurate
- [ ] Report shows total transactions and revenue
- [ ] Timestamps are in correct timezone

### Inventory Reports
- [ ] Low stock report lists items needing reorder
- [ ] Expired/expiring items are flagged
- [ ] Stock value report calculates correctly
- [ ] Report can be filtered by category
- [ ] Report can be exported (CSV/PDF if implemented)

### User Activity
- [ ] Admin can view user activity logs
- [ ] Logs show user, action, timestamp
- [ ] Login attempts are recorded
- [ ] Data modifications are logged
- [ ] Sensitive actions (delete) show who performed them

---

## 7. Data Validation & Error Handling

### Form Validation
- [ ] Required fields show error if empty
- [ ] Email fields validate email format
- [ ] Decimal fields only accept numbers
- [ ] Quantity fields only accept positive integers
- [ ] Error messages are clear and actionable

### API Error Handling
- [ ] 404 errors when resource not found
- [ ] 403 errors when permission denied
- [ ] 400 errors for invalid input
- [ ] 500 errors logged and user sees friendly message
- [ ] Network timeout handled gracefully
- [ ] Loading state clears on error

### Business Logic Validation
- [ ] Cannot have negative prices
- [ ] Cannot have negative stock
- [ ] Cannot order more than available stock
- [ ] Cannot create duplicate users with same username
- [ ] Cannot assign user to multiple pharmacies (if applicable)

---

## 8. Security

### Authentication Security
- [ ] Passwords are never logged or visible
- [ ] JWT tokens expire after set time
- [ ] Refresh tokens work correctly
- [ ] Token is sent in Authorization header, not URL
- [ ] HTTPS enforced in production

### Data Security
- [ ] Sensitive data (passwords, cards) never visible in API responses
- [ ] CORS is properly configured
- [ ] API endpoints require authentication where needed
- [ ] Cannot access other user's data
- [ ] Cannot access other pharmacy's data (multi-tenant)
- [ ] SQL injection prevention (Django ORM handles this)

### Admin Access
- [ ] Admin endpoints restricted to admin users
- [ ] Admin panel (`/admin/`) requires login
- [ ] Admin can only see their own pharmacy data (if multi-tenant)

---

## 9. Performance & Load

### Page Load Performance
- [ ] Home page loads in < 3 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] Product list loads in < 3 seconds
- [ ] Search results return within 1 second
- [ ] No console errors or warnings

### Database Performance
- [ ] Queries optimized (no N+1 queries)
- [ ] Large product lists don't cause slowdown
- [ ] Reports generate in reasonable time (< 5 seconds)
- [ ] Pagination prevents loading all records at once

### Concurrent Users
- [ ] System handles 5+ simultaneous users
- [ ] No race conditions with inventory updates
- [ ] Database transactions are isolated properly
- [ ] Session management for multiple users works

---

## 10. UI/UX & Responsiveness

### Mobile Responsiveness
- [ ] Mobile view is readable and usable
- [ ] Touch targets are appropriately sized
- [ ] No horizontal scrolling needed
- [ ] Forms are mobile-friendly
- [ ] Buttons are easy to tap on mobile

### UI Consistency
- [ ] Colors and fonts are consistent
- [ ] Icons display correctly
- [ ] Loading spinners show during API calls
- [ ] Success/error messages are visible
- [ ] Form validation errors are highlighted

### Navigation
- [ ] Navigation menu is accessible
- [ ] Breadcrumbs show current location (if applicable)
- [ ] Back button works correctly
- [ ] Links navigate to correct pages
- [ ] Logout button is easy to find

---

## 11. Critical User Flows

### New User Registration (if supported)
- [ ] User signs up with valid data
- [ ] Email verification works (if required)
- [ ] User can log in immediately after signup
- [ ] Duplicate email prevention works

### Complete Order Flow
- [ ] Customer logs in
- [ ] Browses and searches products
- [ ] Adds product to order
- [ ] Proceeds to checkout
- [ ] Enters/selects delivery address
- [ ] Chooses payment method
- [ ] Completes order
- [ ] Receives confirmation
- [ ] Can view order history

### Admin Daily Operations
- [ ] Check stock levels
- [ ] View pending orders
- [ ] Process orders
- [ ] View sales report
- [ ] Handle low-stock alerts

### Pharmacist Operations
- [ ] View assigned products
- [ ] Update order status
- [ ] View inventory
- [ ] Cannot access admin panel

---

## 12. Browser Compatibility

- [ ] Chrome (latest version)
- [ ] Firefox (latest version)
- [ ] Safari (latest version)
- [ ] Edge (latest version)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

---

## 13. Deployment & Operations

### Render Deployment
- [ ] Backend service is healthy
- [ ] Frontend service is healthy
- [ ] Database connections working
- [ ] Environment variables properly set
- [ ] Migrations ran successfully
- [ ] Static files served correctly

### Monitoring
- [ ] Error logs are accessible
- [ ] Health check endpoint returns 200
- [ ] No 500 errors in recent logs
- [ ] Performance metrics look normal
- [ ] Database backups are running (if applicable)

---

## 14. Documentation

- [ ] README has clear setup instructions
- [ ] API documentation is available
- [ ] User guides for each role (Admin, Pharmacist, Cashier, Customer)
- [ ] Troubleshooting guide included
- [ ] Contact information for support

---

## Test Execution

### How to Run This Checklist

1. **Setup**
   ```bash
   cd backend
   python manage.py shell < scripts/seed_data.py
   python manage.py runserver
   ```

2. **Test on Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Go through each section** and mark items as complete ([ ])

4. **Document issues** found and assign to developers

5. **Re-test bug fixes** before marking complete

### Reporting Issues

Use this format when documenting issues:

```
## Issue: [Brief Title]
- Severity: Critical / High / Medium / Low
- Steps to Reproduce: 
  1. ...
  2. ...
  3. ...
- Expected Result: ...
- Actual Result: ...
- Environment: [Browser/OS/Version]
- Screenshots: [If applicable]
```

---

## Sign-Off

Once all items are tested and issues resolved:

- [ ] Tested by: _________________ 
- [ ] Date: _____________
- [ ] All critical issues resolved
- [ ] Ready for production deployment

---

## Version History

| Version | Date | Tester | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-03-02 | - | Initial checklist created |

