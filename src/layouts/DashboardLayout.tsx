import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar.tsx';
import { Navbar } from '../components/Navbar.tsx';
import { StockInModal } from '../components/StockInModal.tsx';
import { StockOutModal } from '../components/StockOutModal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

export const DashboardLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.getLowStockProducts();
      setLowStockCount(res.totalCount);
    } catch (err) {
      // Ignore background badge fetch error
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, location.pathname]);

  const getPageTitle = (path: string): string => {
    if (path === '/') return 'Dashboard & Inventory Overview';
    if (path.startsWith('/products')) return 'Product Inventory Management';
    if (path.startsWith('/categories')) return 'Product Categories';
    if (path.startsWith('/movements')) return 'Stock Movements & Transactions';
    if (path.startsWith('/low-stock')) return 'Low Stock & Out-of-Stock Alerts';
    if (path.startsWith('/suppliers')) return 'Supplier Directory & Contacts';
    if (path.startsWith('/purchase-orders')) return 'Purchase Order Management';
    if (path.startsWith('/reports')) return 'Reports & Analytics Center';
    if (path.startsWith('/users')) return 'System User Management';
    if (path.startsWith('/settings')) return 'System & Account Settings';
    return 'Stock Maintenance System';
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar (11 items) */}
      <Sidebar
        lowStockCount={lowStockCount}
        onOpenLogout={() => setIsLogoutConfirmOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onOpenStockIn={() => setIsStockInOpen(true)}
          onOpenStockOut={() => setIsStockOutOpen(true)}
          lowStockCount={lowStockCount}
          title={getPageTitle(location.pathname)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshAlerts: fetchAlerts }} />
        </main>
      </div>

      {/* Quick Action Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={() => {
          fetchAlerts();
          // Dispatch custom event so active pages refresh their data tables
          window.dispatchEvent(new CustomEvent('stock_updated'));
        }}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        onSuccess={() => {
          fetchAlerts();
          window.dispatchEvent(new CustomEvent('stock_updated'));
        }}
      />

      {/* Logout Confirmation */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out"
        message={`Are you sure you want to end your session as ${user?.name || 'this user'}? You will need to log back in to access the system.`}
        confirmLabel="Logout"
        isDanger={true}
      />
    </div>
  );
};
