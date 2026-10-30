# StockMaster Pro - Stock Maintenance & Inventory System

A production-grade, full-stack Stock Maintenance and Inventory Management web application built with Node.js, Express, SQL Relational Database (WAL mode with foreign keys and ACID transactions), React 19, Tailwind CSS, Lucide React, and React Router.

---

## 1. Demo Credentials & User Roles

The database comes pre-seeded with realistic product inventory, categories, suppliers, purchase orders, and 3 distinct user role accounts. 

You can use the **Instant 1-Click Role Login** buttons on the login screen or sign in manually with:

| Role | Email Address | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@stockmaster.com` | `Admin@123` | Full control: user management, catalog CRUD, suppliers, POs, movements, reports |
| **Manager** | `manager@stockmaster.com` | `Manager@123` | Product catalog CRUD, categories, suppliers, PO creation, stock in/out, reports |
| **Staff** | `staff@stockmaster.com` | `Staff@123` | View catalog, execute Stock In & Stock Out, receive PO deliveries, view reports |

---

## 2. Key Modules & Functional Workflows

### A. Authentication & RBAC
- JWT session authentication signed with secret keys (`expiresIn: 7d`).
- Password hashing using `bcryptjs` with 10 salt rounds.
- Role-based authorization middleware (`requireRole('admin')`, etc.) guarding all sensitive API endpoints.
- Admin-controlled user creation, status toggling (`active` / `inactive`), and credential resets.

### B. Real-Time Dashboard
- **Dynamic KPIs**: Total Products, Total Physical Units, Inventory Valuation (both retail and cost basis), Low-Stock Items count, and Out-of-Stock count.
- **Visual 14-Day Movement Activity Chart**: Visual comparison of daily units received (Stock IN) vs issued (Stock OUT).
- **Purchase Order Pipeline**: Order breakdown by status (Draft, Pending/Ordered, Partially Received, Fully Received).
- **Restock Priorities**: Immediate action items with 1-click `+ Restock` buttons.
- **Recent Movements Table**: Live transaction audit log.

### C. Product Management (CRUD)
- Unique SKU validation (enforced in database schema and API controllers).
- Category and Supplier foreign-key associations.
- Selling unit price and unit cost price tracking.
- Minimum stock level thresholds for proactive restocking.
- Multi-parameter search, category filtering, stock-level filtering, sortable columns, and pagination.
- Product details modal with dedicated movement history.
- Soft deactivation or permanent deletion with foreign-key constraint protection.

### D. Atomic Stock Movements
- **Stock In**: Select product, specify received quantity, cost, supplier, reference #, date, and notes. Atomically updates inventory and cost prices while recording a permanent movement log.
- **Stock Out**: Select product, specify issued quantity, reason, reference #, and date. **Strictly validates against available inventory to prevent dispatching more than available stock**.
- Executed using atomic database transactions to guarantee zero inventory drift or race condition corruption.

### E. Low Stock & Deficit Alert Center
- Dedicated alert matrix highlighting products at or below their minimum reorder levels.
- Out-of-Stock items highlighted with critical severity indicators.
- Live calculation of **Deficit Units** and **Estimated Reorder Cost**.
- Direct `+ Stock In` button pre-filling product details for immediate restock.

### F. Supplier Directory
- Full supplier directory (Company name, contact person, email, phone, physical address).
- Active/Inactive vendor status.
- View linked catalog items and count of associated purchase orders.
- Deletion safety checks preventing removal of suppliers with historical purchase orders.

### G. Purchase Order Lifecycle & Partial Receiving
- Multi-product line items with live unit price lookup, quantity, and auto-calculated order total.
- Status workflow: `DRAFT` ➔ `ORDERED` ➔ `PARTIALLY_RECEIVED` ➔ `RECEIVED` / `CANCELLED`.
- **Partial Receiving Support**: Staff/Managers can enter custom quantities delivered per line item.
- **Duplicate Receipt Prevention**: Line items cannot receive more than their outstanding quantity (`quantity - received_quantity`).
- Automatically increments inventory balances and logs `Stock IN` movements upon receiving.

### H. Reports & Analytics Center
- 6 comprehensive reporting views:
  1. **Inventory Master Report** (Stock, valuations, status)
  2. **Stock In Transactions Report** (Date filtered, supplier breakdown)
  3. **Stock Out Dispatches Report** (Date filtered, reasons breakdown)
  4. **Low Stock Deficit Report** (Units needed and reorder costs)
  5. **Purchase Orders Summary Report** (Order fulfillment percentages)
  6. **Category Valuation Report** (Stock distribution and gross margins)
- Date range filters and 1-click **Export to CSV** with native file download.

---

## 3. Technology Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, React Router 7.
- **Backend**: Node.js, Express 4, REST API.
- **Database**: SQL Relational Database (`better-sqlite3` with WAL mode and `foreign_keys = ON`).
- **Security**: JWT tokens, bcrypt password hashing, input validation, role-based route middleware.
- **Environment**: Integrated dev server running on port 3000.

---

## 4. API Endpoints Reference

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT token + user profile.
- `GET /api/auth/me` — Verify session and fetch current user profile.
- `PUT /api/auth/profile` — Update user name and change password.

### Dashboard
- `GET /api/dashboard/stats` — Fetch live inventory aggregates, PO pipeline, 14-day movement charts, and recent activity.

### Products
- `GET /api/products` — Paginated, searchable, and filtered product catalog.
- `GET /api/products/low-stock` — Products below minimum stock level.
- `GET /api/products/:id` — Product detail with transaction history.
- `POST /api/products` — Create new SKU (Admin/Manager).
- `PUT /api/products/:id` — Update product details (Admin/Manager).
- `DELETE /api/products/:id` — Delete/archive product (Admin/Manager).

### Stock Movements
- `GET /api/movements` — Transaction audit logs with filters.
- `POST /api/movements/stock-in` — Record inventory receipt (Atomic transaction).
- `POST /api/movements/stock-out` — Record inventory issue (Insufficient stock prevention).

### Purchase Orders
- `GET /api/orders` — List purchase orders.
- `GET /api/orders/:id` — Detailed line item breakdown.
- `POST /api/orders` — Create new PO with multi-product line items (Admin/Manager).
- `PATCH /api/orders/:id/status` — Update order status (DRAFT, ORDERED, CANCELLED).
- `POST /api/orders/:id/receive` — Receive delivered line items (Partial or complete).
- `DELETE /api/orders/:id` — Delete order (if DRAFT or CANCELLED).

### Reports & CSV Exports
- `GET /api/reports/:reportType` — JSON data preview.
- `GET /api/reports/:reportType?format=csv` — Downloadable CSV attachment.

### Users (Admin Only)
- `GET /api/users` — List all user accounts.
- `POST /api/users` — Create user with hashed password and assigned role.
- `PUT /api/users/:id` — Update role, status, or reset password.
- `DELETE /api/users/:id` — Delete user account.
