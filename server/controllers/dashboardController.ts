import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const dashboardController = {
  getStats(req: AuthenticatedRequest, res: Response) {
    // 1. Overall Product and Inventory Stats
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        COALESCE(SUM(available_quantity), 0) as total_stock,
        COALESCE(SUM(available_quantity * unit_price), 0) as total_retail_valuation,
        COALESCE(SUM(available_quantity * cost_price), 0) as total_cost_valuation,
        SUM(CASE WHEN available_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN available_quantity > 0 AND available_quantity <= minimum_stock_level THEN 1 ELSE 0 END) as low_stock_count
      FROM products
      WHERE status = 'active'
    `).get() as any;

    // 2. Purchase Order Summary
    const poStats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft_orders,
        SUM(CASE WHEN status = 'ORDERED' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'PARTIALLY_RECEIVED' THEN 1 ELSE 0 END) as partial_orders,
        SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) as completed_orders,
        COALESCE(SUM(total_amount), 0) as total_po_amount
      FROM purchase_orders
    `).get() as any;

    // 3. Recent Stock Movements (last 6 transactions)
    const recentMovements = db.prepare(`
      SELECT m.*,
             p.name as product_name,
             p.sku as product_sku,
             p.unit_of_measure,
             u.name as user_name
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
      LEFT JOIN users u ON u.id = m.user_id
      ORDER BY m.date DESC, m.id DESC
      LIMIT 6
    `).all();

    // 4. Critical Stock Alert Products (Top 5 lowest or out of stock)
    const criticalProducts = db.prepare(`
      SELECT p.id, p.name, p.sku, p.available_quantity, p.minimum_stock_level, p.unit_of_measure,
             c.name as category_name,
             (p.minimum_stock_level - p.available_quantity) as deficit
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active' AND p.available_quantity <= p.minimum_stock_level
      ORDER BY p.available_quantity ASC, deficit DESC
      LIMIT 5
    `).all();

    // 5. Stock Movement Chart Data (Last 14 days movement trends)
    // Generate dates for the past 14 days
    const chartDays: Array<{ date: string; in_qty: number; out_qty: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartDays.push({ date: dateStr, in_qty: 0, out_qty: 0 });
    }

    const movementsAgg = db.prepare(`
      SELECT date, movement_type, SUM(quantity) as total_qty
      FROM stock_movements
      WHERE date >= date('now', '-14 days')
      GROUP BY date, movement_type
    `).all() as Array<{ date: string; movement_type: string; total_qty: number }>;

    movementsAgg.forEach((row) => {
      const day = chartDays.find((d) => d.date === row.date);
      if (day) {
        if (row.movement_type === 'IN') {
          day.in_qty = row.total_qty;
        } else if (row.movement_type === 'OUT') {
          day.out_qty = row.total_qty;
        }
      }
    });

    // 6. Category Stock Breakdown
    const categoryBreakdown = db.prepare(`
      SELECT c.name, 
             COUNT(p.id) as product_count,
             COALESCE(SUM(p.available_quantity), 0) as total_quantity,
             COALESCE(SUM(p.available_quantity * p.unit_price), 0) as valuation
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
      GROUP BY c.id
      HAVING product_count > 0
      ORDER BY valuation DESC
    `).all();

    res.json({
      summary: {
        totalProducts: summary.total_products || 0,
        totalStock: summary.total_stock || 0,
        totalValuation: summary.total_retail_valuation || 0,
        totalCostValuation: summary.total_cost_valuation || 0,
        lowStockCount: summary.low_stock_count || 0,
        outOfStockCount: summary.out_of_stock_count || 0,
      },
      poStats: {
        totalOrders: poStats.total_orders || 0,
        draft: poStats.draft_orders || 0,
        pending: poStats.pending_orders || 0,
        partial: poStats.partial_orders || 0,
        completed: poStats.completed_orders || 0,
        totalAmount: poStats.total_po_amount || 0,
      },
      recentMovements,
      criticalProducts,
      movementChart: chartDays,
      categoryBreakdown,
    });
  },
};
