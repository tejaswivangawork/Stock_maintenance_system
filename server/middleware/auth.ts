import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'stockmaster-secure-jwt-secret-key-2026';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Verify user exists and is active in DB
    const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(decoded.id) as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is deactivated. Please contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
}

export function requireRole(...allowedRoles: Array<'admin' | 'manager' | 'staff'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permission denied: Requires role [${allowedRoles.join(', ')}]. Your current role is [${req.user.role}].`,
      });
    }
    next();
  };
}
