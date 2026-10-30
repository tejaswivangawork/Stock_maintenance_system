import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const ordersController = {
  getAllOrders(req: AuthenticatedRequest, res: Response) {
    const { status, supplier_id, search, page = 1, limit = 10 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'ALL') {
      whereClause += ' AND po.status = ?';
      params.push(status);
    }

    if (supplier_id) {
      whereClause += ' AND po.supplier_id = ?';
      params.push(Number(supplier_id));
    }

    if (search) {
      whereClause += ' AND (po.order_number LIKE ? OR s.company_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      ${whereClause}
    `;
    const totalRow = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalRow.total;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const ordersQuery = `
      SELECT po.*,
             s.company_name as supplier_name,
             s.email as supplier_email,
             u.name as created_by_name,
             COUNT(poi.id) as item_count,
             COALESCE(SUM(poi.quantity), 0) as total_ordered_units,
             COALESCE(SUM(poi.received_quantity), 0) as total_received_units
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      ${whereClause}
      GROUP BY po.id
      ORDER BY po.order_date DESC, po.id DESC
      LIMIT ? OFFSET ?
    `;

    const orders = db.prepare(ordersQuery).all(...params, limitNum, offset);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  },

  getOrderById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    const order = db.prepare(`
      SELECT po.*,
             s.company_name as supplier_name,
             s.contact_person as supplier_contact,
             s.email as supplier_email,
             s.phone as supplier_phone,
             s.address as supplier_address,
             u.name as created_by_name
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const items = db.prepare(`
      SELECT poi.*,
             p.name as product_name,
             p.sku as product_sku,
             p.unit_of_measure,
             p.available_quantity as current_stock,
             (poi.quantity - poi.received_quantity) as remaining_quantity
      FROM purchase_order_items poi
      JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id ASC
    `).all(id);

    res.json({ order, items });
  },

  createOrder(req: AuthenticatedRequest, res: Response) {
    const {
      supplier_id,
      order_date = new Date().toISOString().split('T')[0],
      expected_delivery_date,
      notes = '',
      items, // array of { product_id, quantity, unit_price }
    } = req.body;

    if (!supplier_id) {
      return res.status(400).json({ error: 'Supplier is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }

    // Verify supplier exists
    const supplier = db.prepare('SELECT id, company_name FROM suppliers WHERE id = ?').get(supplier_id);
    if (!supplier) {
      return res.status(400).json({ error: 'Selected supplier not found' });
    }

    // Generate unique PO number
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const countToday = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get() as { count: number };
    const orderNumber = `PO-${datePrefix}-${(countToday.count + 1).toString().padStart(4, '0')}`;

    // Calculate line items and total amount
    let totalAmount = 0;
    const validatedItems: Array<{ product_id: number; quantity: number; unit_price: number; total_price: number }> = [];

    for (const item of items) {
      const pid = Number(item.product_id);
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);

      if (!pid || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'All items must have a valid product, quantity > 0, and unit price >= 0' });
      }

      const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(pid);
      if (!product) {
        return res.status(400).json({ error: `Product ID ${pid} does not exist` });
      }

      const lineTotal = Number((qty * price).toFixed(2));
      totalAmount += lineTotal;
      validatedItems.push({
        product_id: pid,
        quantity: qty,
        unit_price: price,
        total_price: lineTotal,
      });
    }

    // Atomic transaction for order creation
    const createTx = db.transaction(() => {
      const insertPO = db.prepare(`
        INSERT INTO purchase_orders (
          order_number, supplier_id, order_date, expected_delivery_date,
          total_amount, status, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, 'ORDERED', ?, ?)
      `);

      const poResult = insertPO.run(
        orderNumber,
        supplier_id,
        order_date,
        expected_delivery_date || null,
        Number(totalAmount.toFixed(2)),
        notes?.trim() || '',
        req.user?.id || null
      );

      const poId = poResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (
          purchase_order_id, product_id, quantity, unit_price, total_price, received_quantity
        ) VALUES (?, ?, ?, ?, ?, 0)
      `);

      for (const it of validatedItems) {
        insertItem.run(poId, it.product_id, it.quantity, it.unit_price, it.total_price);
      }

      return poId;
    });

    try {
      const newPoId = createTx();
      const createdOrder = db.prepare(`
        SELECT po.*, s.company_name as supplier_name
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = ?
      `).get(newPoId);

      res.status(201).json({
        message: `Purchase order ${orderNumber} created successfully`,
        order: createdOrder,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create purchase order' });
    }
  },

  updateStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['DRAFT', 'ORDERED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status change. Allowed manual transitions: ${allowedStatuses.join(', ')}` });
    }

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED' || order.status === 'PARTIALLY_RECEIVED') {
      return res.status(400).json({ error: 'Cannot alter status directly of an order that has received items.' });
    }

    db.prepare(`
      UPDATE purchase_orders 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, id);

    res.json({ message: `Purchase order marked as ${status}` });
  },

  receiveItems(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { items, delivery_date = new Date().toISOString().split('T')[0], notes = '' } = req.body;
    // items: Array of { item_id: number, quantity_to_receive: number }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'List of items to receive is required' });
    }

    // Atomic Receive Transaction
    const executeReceive = db.transaction(() => {
      const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
      if (!order) {
        throw new Error('Purchase order not found');
      }

      if (order.status === 'CANCELLED') {
        throw new Error('Cannot receive items for a cancelled purchase order');
      }

      let anyItemsReceivedInBatch = false;

      for (const reqItem of items) {
        const itemId = Number(reqItem.item_id);
        const qtyToReceive = Number(reqItem.quantity_to_receive);

        if (isNaN(qtyToReceive) || qtyToReceive <= 0) {
          continue; // Skip items with 0 or empty quantity
        }

        const poItem = db.prepare(`
          SELECT poi.*, p.name as product_name, p.cost_price, p.available_quantity
          FROM purchase_order_items poi
          JOIN products p ON p.id = poi.product_id
          WHERE poi.id = ? AND poi.purchase_order_id = ?
        `).get(itemId, id) as any;

        if (!poItem) {
          throw new Error(`Line item ID ${itemId} not found on this purchase order`);
        }

        const remainingToReceive = poItem.quantity - poItem.received_quantity;
        if (qtyToReceive > remainingToReceive) {
          throw new Error(
            `Cannot receive ${qtyToReceive} units for ${poItem.product_name}. Only ${remainingToReceive} units remain outstanding.`
          );
        }

        // 1. Update received_quantity on line item
        db.prepare(`
          UPDATE purchase_order_items 
          SET received_quantity = received_quantity + ?
          WHERE id = ?
        `).run(qtyToReceive, itemId);

        // 2. Increment stock quantity and update cost price on product
        db.prepare(`
          UPDATE products
          SET available_quantity = available_quantity + ?,
              cost_price = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(qtyToReceive, poItem.unit_price, poItem.product_id);

        // 3. Insert stock movement audit record (type: IN)
        db.prepare(`
          INSERT INTO stock_movements (
            product_id, movement_type, quantity, unit_price, reference_number,
            reason, supplier_id, user_id, date, notes
          ) VALUES (?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          poItem.product_id,
          qtyToReceive,
          poItem.unit_price,
          order.order_number,
          'Purchase Order Delivery',
          order.supplier_id,
          req.user?.id || null,
          delivery_date,
          `Received against ${order.order_number}. ${notes?.trim() || ''}`
        );

        anyItemsReceivedInBatch = true;
      }

      if (!anyItemsReceivedInBatch) {
        throw new Error('No items had positive quantities specified for receiving');
      }

      // Check all line items on this PO to determine new status
      const allItems = db.prepare(`
        SELECT quantity, received_quantity 
        FROM purchase_order_items 
        WHERE purchase_order_id = ?
      `).all(id) as Array<{ quantity: number; received_quantity: number }>;

      const allFullyReceived = allItems.every((it) => it.received_quantity >= it.quantity);
      const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      db.prepare(`
        UPDATE purchase_orders
        SET status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newStatus, id);

      return { newStatus };
    });

    try {
      const result = executeReceive();
      res.json({
        message: `Inventory updated successfully. Order status is now ${result.newStatus}.`,
        status: result.newStatus,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to process item receipt' });
    }
  },

  deleteOrder(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status === 'RECEIVED' || order.status === 'PARTIALLY_RECEIVED') {
      return res.status(400).json({ error: 'Cannot delete a purchase order that has already received inventory' });
    }

    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(id);
    res.json({ message: 'Purchase order deleted successfully' });
  },
};
