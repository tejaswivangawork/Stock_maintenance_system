import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const movementsController = {
  getAllMovements(req: AuthenticatedRequest, res: Response) {
    const {
      product_id,
      movement_type,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (product_id) {
      whereClause += ' AND m.product_id = ?';
      params.push(Number(product_id));
    }

    if (movement_type && (movement_type === 'IN' || movement_type === 'OUT')) {
      whereClause += ' AND m.movement_type = ?';
      params.push(movement_type);
    }

    if (start_date) {
      whereClause += ' AND m.date >= ?';
      params.push(String(start_date));
    }

    if (end_date) {
      whereClause += ' AND m.date <= ?';
      params.push(String(end_date));
    }

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR m.reference_number LIKE ? OR m.reason LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      ${whereClause}
    `;
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow.total;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT m.*,
             p.name as product_name,
             p.sku as product_sku,
             p.unit_of_measure,
             p.available_quantity as current_stock,
             s.company_name as supplier_name,
             u.name as user_name
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      LEFT JOIN users u ON u.id = m.user_id
      ${whereClause}
      ORDER BY m.date DESC, m.id DESC
      LIMIT ? OFFSET ?
    `;

    const movements = db.prepare(dataQuery).all(...params, limitNum, offset);

    res.json({
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },

  stockIn(req: AuthenticatedRequest, res: Response) {
    const {
      product_id,
      quantity,
      supplier_id,
      reference_number,
      unit_price,
      date = new Date().toISOString().split('T')[0],
      notes = '',
      reason = 'Stock In / Restock',
    } = req.body;

    const qty = Number(quantity);
    if (!product_id || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid product and positive quantity are required' });
    }

    // Atomic Database Transaction
    const executeStockIn = db.transaction(() => {
      // 1. Verify product exists
      const product = db.prepare('SELECT id, name, available_quantity, unit_price, cost_price FROM products WHERE id = ?').get(product_id) as any;
      if (!product) {
        throw new Error('Product not found');
      }

      const itemCost = unit_price !== undefined && unit_price !== '' ? Number(unit_price) : product.cost_price;

      // 2. Insert movement audit record
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity, unit_price, reference_number,
          reason, supplier_id, user_id, date, notes
        ) VALUES (?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const movementResult = insertMovement.run(
        product_id,
        qty,
        itemCost,
        reference_number?.trim() || `IN-${Date.now().toString().slice(-6)}`,
        reason?.trim() || 'Stock In',
        supplier_id || null,
        req.user?.id || null,
        date,
        notes?.trim() || ''
      );

      // 3. Increment product available quantity and update cost price if provided
      db.prepare(`
        UPDATE products 
        SET available_quantity = available_quantity + ?,
            cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(qty, itemCost, itemCost, product_id);

      const updatedProduct = db.prepare('SELECT id, name, sku, available_quantity FROM products WHERE id = ?').get(product_id);
      const newMovement = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementResult.lastInsertRowid);

      return { product: updatedProduct, movement: newMovement };
    });

    try {
      const result = executeStockIn() as { product: any; movement: any };
      res.status(201).json({
        message: `Successfully received ${qty} units for ${result.product.name}. Current stock: ${result.product.available_quantity}`,
        ...result,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process Stock In operation' });
    }
  },

  stockOut(req: AuthenticatedRequest, res: Response) {
    const {
      product_id,
      quantity,
      reference_number,
      reason,
      date = new Date().toISOString().split('T')[0],
      notes = '',
    } = req.body;

    const qty = Number(quantity);
    if (!product_id || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Valid product and positive quantity are required' });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'A reason for stock-out is required (e.g., Sale, Damaged, Internal Use, Return)' });
    }

    // Atomic Database Transaction with Insufficient Stock Check
    const executeStockOut = db.transaction(() => {
      // 1. Lock and verify product stock
      const product = db.prepare('SELECT id, name, sku, available_quantity, unit_price FROM products WHERE id = ?').get(product_id) as any;
      if (!product) {
        throw new Error('Product not found');
      }

      // Check sufficient quantity
      if (product.available_quantity < qty) {
        throw new Error(
          `Insufficient inventory: Product "${product.name}" has only ${product.available_quantity} available in stock, but ${qty} was requested for dispatch.`
        );
      }

      // 2. Insert movement record
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, quantity, unit_price, reference_number,
          reason, supplier_id, user_id, date, notes
        ) VALUES (?, 'OUT', ?, ?, ?, ?, NULL, ?, ?, ?)
      `);

      const movementResult = insertMovement.run(
        product_id,
        qty,
        product.unit_price,
        reference_number?.trim() || `OUT-${Date.now().toString().slice(-6)}`,
        reason.trim(),
        req.user?.id || null,
        date,
        notes?.trim() || ''
      );

      // 3. Deduct stock atomically
      db.prepare(`
        UPDATE products 
        SET available_quantity = available_quantity - ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(qty, product_id);

      const updatedProduct = db.prepare('SELECT id, name, sku, available_quantity FROM products WHERE id = ?').get(product_id);
      const newMovement = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementResult.lastInsertRowid);

      return { product: updatedProduct, movement: newMovement };
    });

    try {
      const result = executeStockOut() as { product: any; movement: any };
      res.status(201).json({
        message: `Successfully issued ${qty} units for ${result.product.name}. Remaining stock: ${result.product.available_quantity}`,
        ...result,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process Stock Out operation' });
    }
  },
};
