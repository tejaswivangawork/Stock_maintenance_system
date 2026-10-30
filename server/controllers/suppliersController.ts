import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const suppliersController = {
  getAllSuppliers(req: AuthenticatedRequest, res: Response) {
    const { search, status } = req.query;

    let query = `
      SELECT s.*, 
             COUNT(DISTINCT p.id) as product_count,
             COUNT(DISTINCT po.id) as po_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.id
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (s.company_name LIKE ? OR s.contact_person LIKE ? OR s.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (status && (status === 'active' || status === 'inactive')) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    query += ` GROUP BY s.id ORDER BY s.company_name ASC`;

    const suppliers = db.prepare(query).all(...params);
    res.json({ suppliers });
  },

  getSupplierById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const supplier = db.prepare(`
      SELECT s.*, 
             COUNT(DISTINCT p.id) as product_count,
             COUNT(DISTINCT po.id) as po_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.id
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(id);

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const products = db.prepare(`
      SELECT id, name, sku, available_quantity, unit_price, status
      FROM products
      WHERE supplier_id = ?
      ORDER BY name ASC
    `).all(id);

    res.json({ supplier, products });
  },

  createSupplier(req: AuthenticatedRequest, res: Response) {
    const { company_name, contact_person, email, phone, address, status = 'active' } = req.body;

    if (!company_name?.trim() || !contact_person?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Company name, contact person, email, and phone are required' });
    }

    const result = db.prepare(`
      INSERT INTO suppliers (company_name, contact_person, email, phone, address, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      company_name.trim(),
      contact_person.trim(),
      email.trim(),
      phone.trim(),
      address?.trim() || '',
      status
    );

    const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Supplier created successfully', supplier: newSupplier });
  },

  updateSupplier(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { company_name, contact_person, email, phone, address, status } = req.body;

    if (!company_name?.trim() || !contact_person?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Company name, contact person, email, and phone are required' });
    }

    db.prepare(`
      UPDATE suppliers
      SET company_name = ?,
          contact_person = ?,
          email = ?,
          phone = ?,
          address = ?,
          status = COALESCE(?, status),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      company_name.trim(),
      contact_person.trim(),
      email.trim(),
      phone.trim(),
      address?.trim() || '',
      status || null,
      id
    );

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.json({ message: 'Supplier updated successfully', supplier: updated });
  },

  deleteSupplier(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const poCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?').get(id) as { count: number };
    if (poCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete supplier: Linked to ${poCount.count} purchase order(s). You can deactivate the supplier instead.`,
      });
    }

    // Set supplier_id to NULL on products
    db.prepare('UPDATE products SET supplier_id = NULL WHERE supplier_id = ?').run(id);
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);

    res.json({ message: 'Supplier deleted successfully' });
  },
};
