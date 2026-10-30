import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export const usersController = {
  getAllUsers(req: AuthenticatedRequest, res: Response) {
    const users = db.prepare(`
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `).all();
    res.json({ users });
  },

  createUser(req: AuthenticatedRequest, res: Response) {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['admin', 'manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, manager, or staff' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (existing) {
      return res.status(409).json({ error: 'A user with this email address already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(name.trim(), email.trim(), hash, role);

    const newUser = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
    });
  },

  updateUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, role, status, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role && !['admin', 'manager', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Do not allow deactivating or demoting the current logged in user if they are the last admin
    if (user.id === req.user?.id) {
      if (status === 'inactive') {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      }
      if (role && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot remove your own admin privileges' });
      }
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const hash = bcrypt.hashSync(password, 10);
      db.prepare(`
        UPDATE users
        SET name = COALESCE(?, name),
            role = COALESCE(?, role),
            status = COALESCE(?, status),
            password_hash = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(name?.trim() || null, role || null, status || null, hash, id);
    } else {
      db.prepare(`
        UPDATE users
        SET name = COALESCE(?, name),
            role = COALESCE(?, role),
            status = COALESCE(?, status),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(name?.trim() || null, role || null, status || null, id);
    }

    const updated = db.prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id);
    res.json({
      message: 'User updated successfully',
      user: updated,
    });
  },

  deleteUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (Number(id) === req.user?.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted successfully' });
  },
};
