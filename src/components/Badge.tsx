import React from 'react';
import { UserRole, POStatus } from '../types/index.ts';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    purple: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  if (role === 'admin') {
    return <Badge variant="purple">Admin</Badge>;
  }
  if (role === 'manager') {
    return <Badge variant="info">Manager</Badge>;
  }
  return <Badge variant="default">Staff</Badge>;
};

export const StockStatusBadge: React.FC<{
  quantity: number;
  minLevel: number;
}> = ({ quantity, minLevel }) => {
  if (quantity === 0) {
    return <Badge variant="danger">Out of Stock (0)</Badge>;
  }
  if (quantity <= minLevel) {
    return <Badge variant="warning">Low Stock ({quantity})</Badge>;
  }
  return <Badge variant="success">In Stock ({quantity})</Badge>;
};

export const POStatusBadge: React.FC<{ status: POStatus }> = ({ status }) => {
  switch (status) {
    case 'RECEIVED':
      return <Badge variant="success">Fully Received</Badge>;
    case 'PARTIALLY_RECEIVED':
      return <Badge variant="warning">Partially Received</Badge>;
    case 'ORDERED':
      return <Badge variant="info">Ordered / Pending</Badge>;
    case 'DRAFT':
      return <Badge variant="default">Draft</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};
