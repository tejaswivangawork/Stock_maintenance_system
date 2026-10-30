import React from 'react';
import { Menu, ArrowDownRight, ArrowUpRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { RoleBadge } from './Badge.tsx';

interface NavbarProps {
  onToggleMobile: () => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  lowStockCount?: number;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobile,
  onOpenStockIn,
  onOpenStockOut,
  lowStockCount = 0,
  title = 'Inventory Dashboard',
}) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-none">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
            Production Stock Maintenance &amp; Inventory System
          </p>
        </div>
      </div>

      {/* Right: Quick Action Buttons & Alerts & User Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Stock In Button */}
        <button
          onClick={onOpenStockIn}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          title="Record Received Inventory"
        >
          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          <span>Stock In</span>
        </button>

        {/* Quick Stock Out Button */}
        <button
          onClick={onOpenStockOut}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          title="Record Dispatched Inventory"
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span>Stock Out</span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />

        {/* Low Stock Notification Pill */}
        {lowStockCount > 0 ? (
          <Link
            to="/low-stock"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title={`${lowStockCount} items need attention`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="hidden sm:inline">Alerts</span>
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] flex items-center justify-center font-bold">
              {lowStockCount}
            </span>
          </Link>
        ) : (
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-xs font-medium"
            title="Stock levels healthy"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Optimal</span>
          </div>
        )}

        {/* User Role Indicator */}
        {user && (
          <div className="hidden md:flex items-center pl-1">
            <RoleBadge role={user.role} />
          </div>
        )}
      </div>
    </header>
  );
};
