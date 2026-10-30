import express from 'express';
import { initDatabase } from './db.ts';
import { authenticate, requireRole } from './middleware/auth.ts';
import { authController } from './controllers/authController.ts';
import { usersController } from './controllers/usersController.ts';
import { categoriesController } from './controllers/categoriesController.ts';
import { suppliersController } from './controllers/suppliersController.ts';
import { productsController } from './controllers/productsController.ts';
import { movementsController } from './controllers/movementsController.ts';
import { ordersController } from './controllers/ordersController.ts';
import { dashboardController } from './controllers/dashboardController.ts';
import { reportsController } from './controllers/reportsController.ts';

// Initialize and seed database
initDatabase();

export const app = express();

app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    // API routes
  }
  next();
});

// 1. Auth Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authenticate, authController.getMe);
app.put('/api/auth/profile', authenticate, authController.updateProfile);

// 2. Dashboard Route
app.get('/api/dashboard/stats', authenticate, dashboardController.getStats);

// 3. User Management (Admin Only)
app.get('/api/users', authenticate, requireRole('admin'), usersController.getAllUsers);
app.post('/api/users', authenticate, requireRole('admin'), usersController.createUser);
app.put('/api/users/:id', authenticate, requireRole('admin'), usersController.updateUser);
app.delete('/api/users/:id', authenticate, requireRole('admin'), usersController.deleteUser);

// 4. Categories (Admin and Manager can modify, all roles can view)
app.get('/api/categories', authenticate, categoriesController.getAllCategories);
app.post('/api/categories', authenticate, requireRole('admin', 'manager'), categoriesController.createCategory);
app.put('/api/categories/:id', authenticate, requireRole('admin', 'manager'), categoriesController.updateCategory);
app.delete('/api/categories/:id', authenticate, requireRole('admin', 'manager'), categoriesController.deleteCategory);

// 5. Suppliers (Admin and Manager can modify, all roles can view)
app.get('/api/suppliers', authenticate, suppliersController.getAllSuppliers);
app.get('/api/suppliers/:id', authenticate, suppliersController.getSupplierById);
app.post('/api/suppliers', authenticate, requireRole('admin', 'manager'), suppliersController.createSupplier);
app.put('/api/suppliers/:id', authenticate, requireRole('admin', 'manager'), suppliersController.updateSupplier);
app.delete('/api/suppliers/:id', authenticate, requireRole('admin', 'manager'), suppliersController.deleteSupplier);

// 6. Products & Low Stock Alerts
app.get('/api/products', authenticate, productsController.getAllProducts);
app.get('/api/products/low-stock', authenticate, productsController.getLowStockProducts);
app.get('/api/products/:id', authenticate, productsController.getProductById);
app.post('/api/products', authenticate, requireRole('admin', 'manager'), productsController.createProduct);
app.put('/api/products/:id', authenticate, requireRole('admin', 'manager'), productsController.updateProduct);
app.delete('/api/products/:id', authenticate, requireRole('admin', 'manager'), productsController.deleteProduct);

// 7. Stock Movements (Stock In & Stock Out)
app.get('/api/movements', authenticate, movementsController.getAllMovements);
app.post('/api/movements/stock-in', authenticate, movementsController.stockIn);
app.post('/api/movements/stock-out', authenticate, movementsController.stockOut);

// 8. Purchase Orders
app.get('/api/orders', authenticate, ordersController.getAllOrders);
app.get('/api/orders/:id', authenticate, ordersController.getOrderById);
app.post('/api/orders', authenticate, requireRole('admin', 'manager'), ordersController.createOrder);
app.patch('/api/orders/:id/status', authenticate, requireRole('admin', 'manager'), ordersController.updateStatus);
app.post('/api/orders/:id/receive', authenticate, ordersController.receiveItems);
app.delete('/api/orders/:id', authenticate, requireRole('admin', 'manager'), ordersController.deleteOrder);

// 9. Reports & CSV Exports
app.get('/api/reports/inventory', authenticate, reportsController.getInventoryReport);
app.get('/api/reports/stock-in', authenticate, reportsController.getStockInReport);
app.get('/api/reports/stock-out', authenticate, reportsController.getStockOutReport);
app.get('/api/reports/low-stock', authenticate, reportsController.getLowStockReport);
app.get('/api/reports/purchase-orders', authenticate, reportsController.getPurchaseOrderReport);
app.get('/api/reports/valuation', authenticate, reportsController.getValuationReport);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
