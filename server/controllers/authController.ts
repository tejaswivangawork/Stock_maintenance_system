import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { generateToken, AuthenticatedRequest, AuthUser } from '../middleware/auth.ts';

export const authController = {
  login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email address or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated. Contact an administrator.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email address or password' });
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const token = generateToken(authUser);
    res.json({
      message: 'Login successful',
      token,
      user: authUser,
    });
  },

  getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ user: req.user });
  },

  updateProfile(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name, currentPassword, newPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id) as any;
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare(`
        UPDATE users SET name = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?
      `).run(name.trim(), newHash, req.user.id);
    } else {
      db.prepare(`
        UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?
      `).run(name.trim(), req.user.id);
    }

    const updatedUser = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.user.id) as AuthUser;
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  },
};
