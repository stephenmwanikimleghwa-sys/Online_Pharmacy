# Pharmacy Aggregator System - User Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Admin Guide](#admin-guide)
4. [Pharmacist Guide](#pharmacist-guide)
5. [Cashier Guide](#cashier-guide)
6. [Customer Guide](#customer-guide)
7. [Troubleshooting](#troubleshooting)
8. [Support](#support)

---

## System Overview

The Pharmacy Aggregator is a comprehensive pharmacy management system designed to streamline operations for small to medium-sized pharmacies. It provides role-based access to manage products, inventory, orders, and payments efficiently.

### Key Features
- **Product Management**: Add, edit, and manage pharmaceutical products
- **Inventory Tracking**: Monitor stock levels and receive low-stock alerts
- **Order Processing**: Manage customer orders from creation to completion
- **Payment Processing**: Secure payment handling
- **Sales Reports**: View daily, weekly, and monthly analytics
- **User Management**: Multi-user system with role-based permissions

### System Roles
- **Admin**: Full system access, user management, reporting
- **Pharmacist**: Product and inventory management, order processing
- **Cashier**: Order processing and payment handling
- **Customer**: Browse products and place orders

---

## Getting Started

### Accessing the System

1. **Open your browser** and navigate to:
   ```
   https://online-pharmacy-sn88.onrender.com
   ```

2. **Log in** with your credentials:
   - Enter your assigned username
   - Enter your password
   - Click "Login"

3. **After successful login**, you'll be directed to your dashboard

### First-Time Login

If this is your first time:
- Contact your pharmacy admin to obtain login credentials
- Keep your password secure and never share it
- Change your password immediately after first login (optional but recommended)

### Logging Out

1. Click your **profile icon** in the top-right corner
2. Select **"Logout"**
3. Your session will end and you'll return to the login page

---

## Admin Guide

### Admin Dashboard

The admin dashboard provides an overview of:
- Total users in the system
- Recent orders
- System statistics
- Quick access to management tools

### Managing Users

#### View All Users
1. Go to **"Manage Users"** in the sidebar
2. See list of all users with their roles and status
3. Sort or search users by name or email

#### Create New User
1. Click **"+ Add User"** button
2. Fill in the form:
   - **Username**: Unique identifier (letters, numbers, underscores only)
   - **Email**: User's email address
   - **Role**: Select from Admin, Pharmacist, Cashier, or Customer
   - **Password**: Set a secure initial password
3. Click **"Create User"**
4. Share credentials with the user securely

#### Edit User
1. Find the user in the list
2. Click the **edit icon** (pencil)
3. Modify the user's information
4. Click **"Save Changes"**

#### Delete User
1. Find the user in the list
2. Click the **delete icon** (trash)
3. Confirm deletion in the dialog
4. User account will be deactivated

### Managing Products

#### Add New Product
1. Go to **"Products"** → **"Add Product"**
2. Fill in the form:
   - **Product Name**: e.g., "Aspirin 500mg"
   - **Category**: Select appropriate category
   - **Price (KES)**: Enter selling price
   - **Dosage Form**: Tablet, Capsule, Syrup, etc.
   - **Manufacturer**: Drug manufacturer name
   - **Strength**: e.g., "500mg"
   - **Initial Stock**: Quantity in stock
   - **Reorder Threshold**: Low-stock alert level
   - **Supplier**: Supplier contact/name

3. **Optional**:
   - Upload product image
   - Mark as featured (shows on homepage)
   
4. Click **"Create Product"**

#### Mark Products as Featured
1. Go to **"Products"**
2. Find the product you want to feature
3. Click the **"Feature"** button
4. Product appears on homepage for customers

#### View Product Details
1. Click on any product name
2. See:
   - Product information
   - Current stock level
   - Price and category
   - Edit and delete options
   - Sales history

### Viewing Reports

#### Daily Sales Report
1. Go to **"Reports"** → **"Sales"**
2. Select date range
3. View:
   - Total transactions
   - Total revenue
   - Top-selling products
   - Export option (if available)

#### Inventory Report
1. Go to **"Reports"** → **"Inventory"**
2. See:
   - Low-stock items needing reorder
   - Upcoming expiry dates
   - Total inventory value
   - Top products by stock level

#### User Activity Log
1. Go to **"Reports"** → **"Activity Log"**
2. View all system actions with timestamps
3. See who performed each action

### System Settings

#### Configure CORS (API Access)
- If adding API integrations, contact support to whitelist domains

#### Manage Pharmacy Information
1. Go to **"Settings"** → **"Pharmacy Info"**
2. Update:
   - Pharmacy name
   - Address
   - Contact phone
   - License number
3. Click **"Save"**

---

## Pharmacist Guide

### Pharmacist Dashboard

Your dashboard shows:
- Pending orders awaiting approval
- Low-stock products
- Recent product updates
- Quick access to inventory

### Managing Inventory

#### Check Stock Levels
1. Go to **"Inventory"**
2. See all products with current stock
3. **Green**: Adequate stock
4. **Yellow**: Low stock (below threshold)
5. **Red**: Critical/Out of stock

#### Update Stock
1. Find the product in inventory
2. Click on it to view details
3. Click **"Adjust Quantity"**
4. Enter the new quantity
5. Add reason (e.g., "Received shipment")
6. Click **"Confirm"**

#### Receive New Shipment
1. Go to **"Inventory"** → **"Receive Stock"**
2. Enter:
   - Product name
   - Quantity received
   - Supplier name
   - Invoice number
3. System updates stock automatically

#### Identify Items Needing Reorder
1. Go to **"Reports"** → **"Reorder Alert"**
2. See products below reorder threshold
3. Review supplier contact info
4. Place order with supplier

### Creating Products

#### Add New Product
1. Go to **"Products"** → **"Add New"**
2. Fill in all required fields (see Admin Guide for details)
3. Save with your signature
4. Admin reviews for approval (if required)

#### Edit Products
1. Find product in list
2. Click edit icon
3. Update information
4. Save changes immediately

### Processing Orders

#### View Pending Orders
1. Go to **"Orders"**
2. Filter by status: **Pending**
3. See list of orders awaiting approval

#### Review Order Details
1. Click on an order
2. See:
   - Customer name
   - Products ordered with quantities
   - Order total
   - Delivery address
   - Order date/time

#### Approve Order
1. Review items are in stock
2. Click **"Approve"**
3. System reserves inventory
4. Order moves to "Approved" status

#### Reject Order (if needed)
1. Click **"Reject"**
2. Enter reason (optional)
3. Order returned to pending for cashier

#### Mark Order as Completed
1. Go to **"Orders"** → **"Approved"**
2. After customer receives items
3. Click **"Complete"**
4. Inventory deducted from system

### Expiry Date Management

#### Check Expiry Dates
1. Go to **"Reports"** → **"Expiry Alert"**
2. See products expiring in:
   - Next 30 days (Yellow)
   - Next 7 days (Red)

#### Mark Products as Expired
1. Go to **"Inventory"**
2. Find expired product
3. Click **"Mark Expired"**
4. Stock reduced automatically
5. Admin notified for audit

---

## Cashier Guide

### Cashier Dashboard

Your dashboard shows:
- Orders pending payment
- Quick links to payment processing
- Daily summary stats

### Processing Orders

#### View Customer Orders
1. Go to **"Orders"**
2. See all orders or filter by:
   - Date range
   - Customer name
   - Status

#### Create New Order
1. Click **"New Order"**
2. Select customer (or create if new)
3. Add products:
   - Search and select product
   - Enter quantity
   - Click "Add to Order"
4. Review order total
5. Click **"Create Order"**

#### Update Order Status
1. Find order in list
2. Click to view details
3. Click **"Approve"** → **"Complete"** as items are ready

### Payment Processing

#### Process Cash Payment
1. Open order details
2. Click **"Add Payment"**
3. Select **"Cash"**
4. Enter amount received
5. System shows change due
6. Click **"Confirm Payment"**
7. Generate receipt (if printer available)

#### Process Card Payment
1. Open order details
2. Click **"Add Payment"**
3. Select **"Card"**
4. Provide card terminal/reader
5. Customer swipes/taps card
6. System confirms payment
7. Receipt printed automatically

#### Process M-Pesa Payment
1. Open order details
2. Click **"Add Payment"**
3. Select **"M-Pesa"**
4. Enter M-Pesa reference/transaction ID
5. Verify in M-Pesa logs
6. Click **"Confirm"**

#### Handle Partial Payments
1. Click **"Add Payment"** on order
2. Enter partial amount
3. Repeat until order fully paid
4. System shows remaining balance

### Managing Receipts

#### Print Receipt
1. After payment processed
2. Click **"Print Receipt"**
3. Confirm printer settings
4. Receipt prints automatically

#### Email Receipt
1. Click **"Email Receipt"**
2. Confirm customer email
3. Receipt sent automatically

#### View Receipt History
1. Go to **"Receipts"**
2. Search by:
   - Date
   - Order ID
   - Customer name
3. Re-print or email as needed

---

## Customer Guide

### Customer Dashboard

Your dashboard shows:
- "Featured Products" section (bestsellers/specials)
- Quick search for products
- Browse categories
- My Orders section

### Browsing Products

#### Search Products
1. Enter product name in search box
2. Press Enter or click Search
3. See matching results
4. Click product for details

#### Browse by Category
1. Click **"Categories"** in navigation
2. Select desired category:
   - Pain Relief
   - Antibiotics
   - Vitamins & Supplements
   - Chronic Care
   - Dermatology
   - Other
3. See products in that category

#### View Product Details
1. Click on any product
2. See:
   - Product image
   - Price
   - Description
   - Availability
   - Add to Order button

### Placing Orders

#### Create New Order
1. Click **"New Order"** or **"Start Shopping"**
2. Browse or search for products
3. Click **"Add to Order"** button
4. Enter quantity
5. Continue shopping or proceed to checkout

#### Review Order
1. At checkout, review items:
   - Product names
   - Quantities
   - Unit prices
   - Total cost
2. Update quantities if needed (click item)
3. Remove items if needed (click delete icon)

#### Proceed to Payment
1. Enter delivery address (if applicable)
2. Review order total
3. Confirm order submission
4. Payment processed by pharmacist/cashier
5. Receive order confirmation

#### Track Order

1. Go to **"My Orders"**
2. See all your orders with status:
   - **Pending**: Awaiting approval
   - **Approved**: Ready for pickup
   - **Completed**: Ready to collect
3. Click order for details

### My Account

#### View Profile
1. Click your **name** in top-right
2. See your information:
   - Username
   - Email
   - Phone number (if provided)
3. Click **"Edit Profile"** to update

#### Change Password
1. Click your **name** in top-right
2. Select **"Change Password"**
3. Enter current password
4. Enter new password (twice)
5. Click **"Change"**

#### View Order History
1. Go to **"My Orders"**
2. See all past and current orders
3. Click any order for details
4. Download or print receipt if available

---

## Troubleshooting

### Login Issues

**Problem**: "Unable to log in with provided credentials"
- **Solution**: Double-check username and password (case-sensitive)
- **Solution**: Ensure Caps Lock is off
- **Solution**: Reset password via "Forgot Password" link
- **Solution**: Contact admin if account locked

**Problem**: "Your account has been disabled"
- **Solution**: Contact your pharmacy admin
- **Solution**: May be deactivated for security reasons

### Product Issues

**Problem**: "Cannot see product I just added"
- **Solution**: Refresh the page (Ctrl+F5)
- **Solution**: Clear browser cache
- **Solution**: Check product is marked as "Active"
- **Solution**: May require admin approval

**Problem**: "Product shows as out of stock but should have items"
- **Solution**: Check if stock was updated recently
- **Solution**: Verify with pharmacist if items were delivered
- **Solution**: Contact admin to adjust stock manually

### Order Issues

**Problem**: "Cannot order because 'Out of Stock'"
- **Solution**: Check inventory - product may be sold out
- **Solution**: Contact pharmacist about reorder
- **Solution**: Choose alternative product

**Problem**: "Order deleted accidentally"
- **Solution**: Contact admin - may be recoverable from logs
- **Solution**: Create new order immediately

### Payment Issues

**Problem**: "Payment declined"
- **Solution**: Verify card details are correct
- **Solution**: Check card is not expired
- **Solution**: Ensure sufficient funds
- **Solution**: Try different payment method
- **Solution**: Contact your bank

**Problem**: "Payment processed but order not confirmed"
- **Solution**: Wait 2-3 minutes for system to sync
- **Solution**: Refresh page
- **Solution**: Contact cashier/admin to verify payment
- **Solution**: Do not reprocess payment

### System Performance

**Problem**: "Page is loading slowly"
- **Solution**: Check your internet connection
- **Solution**: Refresh page (Ctrl+F5)
- **Solution**: Clear browser cache
- **Solution**: Try different browser
- **Solution**: Try again during off-peak hours

**Problem**: "Getting 404 or 'Page Not Found' error"
- **Solution**: Verify URL is correct
- **Solution**: Refresh page
- **Solution**: Log out and log back in
- **Solution**: Clear browser cookies
- **Solution**: Contact support if persists

### Browser Compatibility

The system works best on:
- Chrome (Version 90+)
- Firefox (Version 88+)
- Safari (Version 14+)
- Edge (Version 90+)

**If experiencing issues:**
- Try a different browser
- Update your browser to latest version
- Clear cookies and cache
- Disable browser extensions

---

## Support

### Getting Help

#### In-System Help
- Look for **"?"** icon on any page for contextual help
- Hover over icons/buttons for tooltips
- Check "Help" menu in navigation

#### Contacting Support

**For Technical Issues:**
- **Email**: support@transcountypharmacy.com
- **Phone**: +254 (0) 700 000 000
- **Hours**: Monday-Friday, 9 AM - 5 PM EAT

**For Urgent Issues:**
- Call pharmacist on duty
- Report to admin immediately
- Provide error message and steps to reproduce

#### Providing Good Support Feedback

Include:
1. What you were doing when error occurred
2. The error message (exact text)
3. Your username/role
4. Steps to reproduce the issue
5. Screenshot if possible
6. Browser and device information

### Common Support Topics

**Topic**: Inventory not updating
- **Contact**: Pharmacist or Admin
- **Response Time**: 24 hours

**Topic**: Cannot access certain features
- **Contact**: Admin
- **Response Time**: 24-48 hours

**Topic**: Payment issues
- **Contact**: Cashier or Admin
- **Response Time**: Immediately

**Topic**: Missing products
- **Contact**: Pharmacist
- **Response Time**: 24 hours

### System Maintenance

**Scheduled Maintenance Window:**
- Date: First Sunday of each month
- Time: 2 AM - 4 AM EAT
- The system will be unavailable during this time
- Critical operations should be completed before maintenance

**Emergency Downtime:**
- If system goes down unexpectedly during business hours
- Admin will notify all users
- Estimated recovery time will be provided

---

## Quick Reference

### Useful Keyboard Shortcuts
- **Ctrl+F**: Search on page
- **Ctrl+P**: Print current page/receipt
- **Escape**: Close any popup dialog
- **Enter**: Submit form

### Default Login Credentials (Change immediately after first login)
- **Admin**: admin_user / AdminPass123
- **Pharmacist**: pharmacist_jane / PharmPass123
- **Cashier**: cashier_bob / CashPass123
- **Customer**: customer_alice / CustPass123

### Important Contacts
- **System Admin**: admin@transcountypharmacy.com
- **Pharmacist on Duty**: [Posted at pharmacy desk]
- **Emergency**: +254 700 000 000

---

## Document Information

**Version**: 1.0  
**Last Updated**: March 2, 2026  
**Applicable To**: Pharmacy Aggregator v1.0  
**Next Review**: September 2, 2026

For documentation updates, contact your system administrator.

