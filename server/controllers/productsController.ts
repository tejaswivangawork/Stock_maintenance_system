import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const productsController = {
  getAllProducts(req: AuthenticatedRequest, res: Response) {
    const {
      search,
      category_id,
      supplier_id,
      status,
      stock_status, // 'all', 'low', 'out', 'normal'
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (category_id) {
      whereClause += ` AND p.category_id = ?`;
      params.push(Number(category_id));
    }

    if (supplier_id) {
      whereClause += ` AND p.supplier_id = ?`;
      params.push(Number(supplier_id));
    }

    if (status && (status === 'active' || status === 'inactive')) {
      whereClause += ` AND p.status = ?`;
      params.push(status);
    }

    if (stock_status === 'out') {
      whereClause += ` AND p.available_quantity = 0`;
    } else if (stock_status === 'low') {
      whereClause += ` AND p.available_quantity > 0 AND p.available_quantity <= p.minimum_stock_level`;
    } else if (stock_status === 'normal') {
      whereClause += ` AND p.available_quantity > p.minimum_stock_level`;
    }

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow.total;

    // Sorting whitelist
    const allowedSortFields: Record<string, string> = {
      name: 'p.name',
      sku: 'p.sku',
      available_quantity: 'p.available_quantity',
      unit_price: 'p.unit_price',
      cost_price: 'p.cost_price',
      created_at: 'p.created_at',
      category_name: 'c.name',
    };
    const orderField = allowedSortFields[String(sort_by)] || 'p.created_at';
    const orderDir = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT p.*, 
             c.name as category_name,
             s.company_name as supplier_name,
             CASE 
               WHEN p.available_quantity = 0 THEN 'OUT_OF_STOCK'
               WHEN p.available_quantity <= p.minimum_stock_level THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status,
             (p.available_quantity * p.unit_price) as total_valuation,
             (p.available_quantity * p.cost_price) as total_cost_valuation
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      ${whereClause}
      ORDER BY ${orderField} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const products = db.prepare(dataQuery).all(...params, limitNum, offset);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },

  getProductById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const product = db.prepare(`
      SELECT p.*, 
             c.name as category_name,
             s.company_name as supplier_name,
             CASE 
               WHEN p.available_quantity = 0 THEN 'OUT_OF_STOCK'
               WHEN p.available_quantity <= p.minimum_stock_level THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status,
             (p.available_quantity * p.unit_price) as total_valuation
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch recent stock movements for this product
    const recentMovements = db.prepare(`
      SELECT m.*, u.name as user_name, s.company_name as supplier_name
      FROM stock_movements m
      LEFT JOIN users u ON u.id = m.user_id
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      WHERE m.product_id = ?
      ORDER BY m.date DESC, m.id DESC
      LIMIT 10
    `).all(id);

    res.json({ product, recentMovements });
  },

  createProduct(req: AuthenticatedRequest, res: Response) {
    const {
      name,
      sku,
      description,
      category_id,
      supplier_id,
      unit_price,
      cost_price = 0,
      available_quantity = 0,
      minimum_stock_level = 10,
      unit_of_measure = 'pcs',
      status = 'active',
    } = req.body;

    if (!name?.trim() || !sku?.trim() || !category_id) {
      return res.status(400).json({ error: 'Product name, SKU, and category are required' });
    }

    if (Number(unit_price) < 0 || Number(available_quantity) < 0 || Number(minimum_stock_level) < 0) {
      return res.status(400).json({ error: 'Prices and stock quantities cannot be negative' });
    }

    // Check SKU uniqueness
    const existingSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)').get(sku.trim());
    if (existingSku) {
      return res.status(409).json({ error: `SKU "${sku.trim()}" is already in use by another product` });
    }

    // Check category exists
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO products (
        name, sku, description, category_id, supplier_id,
        unit_price, cost_price, available_quantity, minimum_stock_level,
        unit_of_measure, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      name.trim(),
      sku.trim().toUpperCase(),
      description?.trim() || '',
      category_id,
      supplier_id || null,
      Number(unit_price),
      Number(cost_price) || 0,
      Number(available_quantity),
      Number(minimum_stock_level),
      unit_of_measure?.trim() || 'pcs',
      status
    );

    const newProductId = result.lastInsertRowid;

    // If initial quantity > 0, record an initial stock movement
    if (Number(available_quantity) > 0) {
      db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity, unit_price, reference_number,
          reason, supplier_id, user_id, date, notes
        ) VALUES (?, 'IN', ?, ?, 'INITIAL-STOCK', 'Initial Inventory Count', ?, ?, date('now'), 'Initial stock balance entered on creation')
      `).run(
        newProductId,
        Number(available_quantity),
        Number(cost_price || unit_price),
        supplier_id || null,
        req.user?.id || null
      );
    }

    const newProduct = db.prepare(`
      SELECT p.*, c.name as category_name, s.company_name as supplier_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(newProductId);

    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  },

  updateProduct(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const {
      name,
      sku,
      description,
      category_id,
      supplier_id,
      unit_price,
      cost_price,
      minimum_stock_level,
      unit_of_measure,
      status,
    } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (sku) {
      const duplicateSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?').get(sku.trim(), id);
      if (duplicateSku) {
        return res.status(409).json({ error: `SKU "${sku.trim()}" is already taken by another product` });
      }
    }

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          description = COALESCE(?, description),
          category_id = COALESCE(?, category_id),
          supplier_id = ?,
          unit_price = COALESCE(?, unit_price),
          cost_price = COALESCE(?, cost_price),
          minimum_stock_level = COALESCE(?, minimum_stock_level),
          unit_of_measure = COALESCE(?, unit_of_measure),
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name?.trim() || null,
      sku?.trim() ? sku.trim().toUpperCase() : null,
      description !== undefined ? description?.trim() : null,
      category_id || null,
      supplier_id || null,
      unit_price !== undefined ? Number(unit_price) : null,
      cost_price !== undefined ? Number(cost_price) : null,
      minimum_stock_level !== undefined ? Number(minimum_stock_level) : null,
      unit_of_measure?.trim() || null,
      status || null,
      id
    );

    const updatedProduct = db.prepare(`
      SELECT p.*, c.name as category_name, s.company_name as supplier_name,
             CASE 
               WHEN p.available_quantity = 0 THEN 'OUT_OF_STOCK'
               WHEN p.available_quantity <= p.minimum_stock_level THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status,
             (p.available_quantity * p.unit_price) as total_valuation
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(id);

    res.json({ message: 'Product updated successfully', product: updatedProduct });
  },

  deleteProduct(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    // Check movements or PO items referencing this product
    const movementCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?').get(id) as { count: number };
    const poItemCount = db.prepare('SELECT COUNT(*) as count FROM purchase_order_items WHERE product_id = ?').get(id) as { count: number };

    if (movementCount.count > 0 || poItemCount.count > 0) {
      // Instead of failing or deleting history, deactivate or allow user to toggle inactive
      return res.status(400).json({
        error: `Cannot delete product: It has ${movementCount.count} stock movements and ${poItemCount.count} purchase order items recorded. You can deactivate this product to archive it without corrupting audit history.`,
      });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted successfully' });
  },

  getLowStockProducts(req: AuthenticatedRequest, res: Response) {
    const lowStockItems = db.prepare(`
      SELECT p.*, 
             c.name as category_name,
             s.company_name as supplier_name,
             (p.minimum_stock_level - p.available_quantity) as deficit_quantity,
             CASE 
               WHEN p.available_quantity = 0 THEN 'OUT_OF_STOCK'
               ELSE 'LOW_STOCK'
             END as alert_level
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.status = 'active' AND p.available_quantity <= p.minimum_stock_level
      ORDER BY p.available_quantity ASC, deficit_quantity DESC
    `).all();

    res.json({
      lowStockProducts: lowStockItems,
      totalCount: lowStockItems.length,
      outOfStockCount: lowStockItems.filter((i: any) => i.available_quantity === 0).length,
    });
  },
};
