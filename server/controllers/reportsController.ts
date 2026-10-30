import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

function convertToCSV(data: any[], columns: Array<{ header: string; key: string }>): string {
  if (!data || data.length === 0) {
    return columns.map((c) => `"${c.header}"`).join(',') + '\n';
  }

  const headerRow = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((item) => {
    return columns
      .map((c) => {
        const val = item[c.key] !== undefined && item[c.key] !== null ? String(item[c.key]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\n');
}

export const reportsController = {
  getInventoryReport(req: AuthenticatedRequest, res: Response) {
    const { category_id, format } = req.query;

    let query = `
      SELECT p.id, p.name, p.sku, c.name as category, s.company_name as supplier,
             p.unit_price, p.cost_price, p.available_quantity, p.minimum_stock_level,
             p.unit_of_measure,
             (p.available_quantity * p.unit_price) as retail_valuation,
             (p.available_quantity * p.cost_price) as cost_valuation,
             CASE 
               WHEN p.available_quantity = 0 THEN 'OUT_OF_STOCK'
               WHEN p.available_quantity <= p.minimum_stock_level THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status,
             p.status
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(Number(category_id));
    }
    query += ' ORDER BY p.name ASC';

    const records = db.prepare(query).all(...params);

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'Product Name', key: 'name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Category', key: 'category' },
        { header: 'Supplier', key: 'supplier' },
        { header: 'Stock Qty', key: 'available_quantity' },
        { header: 'UOM', key: 'unit_of_measure' },
        { header: 'Min Level', key: 'minimum_stock_level' },
        { header: 'Cost Price ($)', key: 'cost_price' },
        { header: 'Unit Price ($)', key: 'unit_price' },
        { header: 'Cost Valuation ($)', key: 'cost_valuation' },
        { header: 'Retail Valuation ($)', key: 'retail_valuation' },
        { header: 'Status', key: 'stock_status' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },

  getStockInReport(req: AuthenticatedRequest, res: Response) {
    const { start_date, end_date, supplier_id, format } = req.query;

    let query = `
      SELECT m.id, m.date, m.reference_number, p.name as product_name, p.sku,
             m.quantity, m.unit_price, (m.quantity * COALESCE(m.unit_price, 0)) as total_value,
             s.company_name as supplier_name, m.reason, u.name as received_by, m.notes
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN suppliers s ON s.id = m.supplier_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.movement_type = 'IN'
    `;
    const params: any[] = [];

    if (start_date) {
      query += ' AND m.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND m.date <= ?';
      params.push(end_date);
    }
    if (supplier_id) {
      query += ' AND m.supplier_id = ?';
      params.push(Number(supplier_id));
    }
    query += ' ORDER BY m.date DESC, m.id DESC';

    const records = db.prepare(query).all(...params);

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'Date', key: 'date' },
        { header: 'Reference #', key: 'reference_number' },
        { header: 'Product Name', key: 'product_name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Quantity In', key: 'quantity' },
        { header: 'Unit Cost ($)', key: 'unit_price' },
        { header: 'Total Value ($)', key: 'total_value' },
        { header: 'Supplier', key: 'supplier_name' },
        { header: 'Reason', key: 'reason' },
        { header: 'Received By', key: 'received_by' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock-in-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },

  getStockOutReport(req: AuthenticatedRequest, res: Response) {
    const { start_date, end_date, reason, format } = req.query;

    let query = `
      SELECT m.id, m.date, m.reference_number, p.name as product_name, p.sku,
             m.quantity, m.unit_price, (m.quantity * COALESCE(m.unit_price, 0)) as total_value,
             m.reason, u.name as issued_by, m.notes
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.movement_type = 'OUT'
    `;
    const params: any[] = [];

    if (start_date) {
      query += ' AND m.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND m.date <= ?';
      params.push(end_date);
    }
    if (reason) {
      query += ' AND m.reason LIKE ?';
      params.push(`%${reason}%`);
    }
    query += ' ORDER BY m.date DESC, m.id DESC';

    const records = db.prepare(query).all(...params);

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'Date', key: 'date' },
        { header: 'Reference #', key: 'reference_number' },
        { header: 'Product Name', key: 'product_name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Quantity Issued', key: 'quantity' },
        { header: 'Unit Price ($)', key: 'unit_price' },
        { header: 'Total Value ($)', key: 'total_value' },
        { header: 'Reason', key: 'reason' },
        { header: 'Issued By', key: 'issued_by' },
        { header: 'Notes', key: 'notes' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="stock-out-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },

  getLowStockReport(req: AuthenticatedRequest, res: Response) {
    const { format } = req.query;

    const records = db.prepare(`
      SELECT p.id, p.name, p.sku, c.name as category, s.company_name as supplier,
             p.available_quantity, p.minimum_stock_level, p.unit_of_measure,
             (p.minimum_stock_level - p.available_quantity) as deficit_quantity,
             p.cost_price,
             ((p.minimum_stock_level - p.available_quantity) * p.cost_price) as estimated_reorder_cost,
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

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'Product Name', key: 'name' },
        { header: 'SKU', key: 'sku' },
        { header: 'Category', key: 'category' },
        { header: 'Supplier', key: 'supplier' },
        { header: 'Current Stock', key: 'available_quantity' },
        { header: 'Min Level', key: 'minimum_stock_level' },
        { header: 'Deficit Qty', key: 'deficit_quantity' },
        { header: 'Unit Cost ($)', key: 'cost_price' },
        { header: 'Est. Reorder Cost ($)', key: 'estimated_reorder_cost' },
        { header: 'Severity', key: 'alert_level' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="low-stock-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },

  getPurchaseOrderReport(req: AuthenticatedRequest, res: Response) {
    const { start_date, end_date, status, format } = req.query;

    let query = `
      SELECT po.order_number, po.order_date, po.expected_delivery_date,
             s.company_name as supplier, po.status, po.total_amount,
             COUNT(poi.id) as item_lines,
             COALESCE(SUM(poi.quantity), 0) as total_units_ordered,
             COALESCE(SUM(poi.received_quantity), 0) as total_units_received,
             u.name as created_by
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      query += ' AND po.order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND po.order_date <= ?';
      params.push(end_date);
    }
    if (status && status !== 'ALL') {
      query += ' AND po.status = ?';
      params.push(status);
    }
    query += ' GROUP BY po.id ORDER BY po.order_date DESC';

    const records = db.prepare(query).all(...params);

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'PO Number', key: 'order_number' },
        { header: 'Order Date', key: 'order_date' },
        { header: 'Expected Delivery', key: 'expected_delivery_date' },
        { header: 'Supplier', key: 'supplier' },
        { header: 'Status', key: 'status' },
        { header: 'Total Amount ($)', key: 'total_amount' },
        { header: 'Line Items', key: 'item_lines' },
        { header: 'Units Ordered', key: 'total_units_ordered' },
        { header: 'Units Received', key: 'total_units_received' },
        { header: 'Created By', key: 'created_by' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="purchase-orders-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },

  getValuationReport(req: AuthenticatedRequest, res: Response) {
    const { format } = req.query;

    const records = db.prepare(`
      SELECT c.name as category_name,
             COUNT(p.id) as total_items,
             COALESCE(SUM(p.available_quantity), 0) as total_stock_units,
             COALESCE(SUM(p.available_quantity * p.cost_price), 0) as total_cost_value,
             COALESCE(SUM(p.available_quantity * p.unit_price), 0) as total_retail_value,
             COALESCE(SUM(p.available_quantity * (p.unit_price - p.cost_price)), 0) as potential_profit
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
      GROUP BY c.id
      ORDER BY total_retail_value DESC
    `).all();

    if (format === 'csv') {
      const csv = convertToCSV(records, [
        { header: 'Category', key: 'category_name' },
        { header: 'Total Active Products', key: 'total_items' },
        { header: 'Total Units in Stock', key: 'total_stock_units' },
        { header: 'Cost Valuation ($)', key: 'total_cost_value' },
        { header: 'Retail Valuation ($)', key: 'total_retail_value' },
        { header: 'Potential Margin ($)', key: 'potential_profit' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-valuation-report.csv"');
      return res.send(csv);
    }

    res.json({ records });
  },
};
