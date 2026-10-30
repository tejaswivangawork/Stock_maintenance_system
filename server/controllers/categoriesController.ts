import { Response } from 'express';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const categoriesController = {
  getAllCategories(req: AuthenticatedRequest, res: Response) {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();
    res.json({ categories });
  },

  createCategory(req: AuthenticatedRequest, res: Response) {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(name.trim());
    if (existing) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(
      name.trim(),
      description?.trim() || ''
    );

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Category created successfully', category: newCategory });
  },

  updateCategory(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(name.trim(), id);
    if (existing) {
      return res.status(409).json({ error: 'Another category already has this name' });
    }

    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
      name.trim(),
      description?.trim() || '',
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ message: 'Category updated successfully', category: updated });
  },

  deleteCategory(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as { count: number };
    if (productCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${productCount.count} product(s) are currently assigned to it. Reassign or delete the products first.`,
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ message: 'Category deleted successfully' });
  },
};
