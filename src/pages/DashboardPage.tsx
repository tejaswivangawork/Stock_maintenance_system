import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  ArrowRight,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DashboardData } from '../types/index.ts';
import { Badge, StockStatusBadge } from '../components/Badge.tsx';
import { StockInModal } from '../components/StockInModal.tsx';
import { StockOutModal } from '../components/StockOutModal.tsx';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick action modal states
  const [restockProductId, setRestockProductId] = useState<number | undefined>(undefined);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const stats = await api.getDashboardStats();
      setData(stats);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const handleStockUpdate = () => fetchStats();
    window.addEventListener('stock_updated', handleStockUpdate);
    return () => window.removeEventListener('stock_updated', handleStockUpdate);
  }, [fetchStats]);

  const handleQuickRestock = (productId: number) => {
    setRestockProductId(productId);
    setIsStockInOpen(true);
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading live stock statistics...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
        <p className="font-semibold mb-2">Error loading dashboard</p>
        <p className="text-sm mb-4">{errorMsg}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, poStats, recentMovements, criticalProducts, movementChart, categoryBreakdown } =
    data;

  // Maximum value for chart scaling
  const maxChartVal = Math.max(
    1,
    ...movementChart.map((d) => Math.max(d.in_qty, d.out_qty))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Low/Out of Stock */}
      {(summary.outOfStockCount > 0 || summary.lowStockCount > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Inventory Attention Required
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-semibold text-rose-700">
                  {summary.outOfStockCount} product(s) out of stock
                </span>{' '}
                and{' '}
                <span className="font-semibold text-amber-700">
                  {summary.lowStockCount} product(s) below minimum reorder level
                </span>
                .
              </p>
            </div>
          </div>
          <Link
            to="/low-stock"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <span>View Alerts Center</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{summary.totalProducts}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Catalog SKUs tracked</p>
          </div>
        </div>

        {/* Total Available Stock Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Stock Units
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {summary.totalStock.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Physical units in bays</p>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inventory Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              ${summary.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cost basis: ${summary.totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-700">{summary.lowStockCount}</div>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Below threshold</p>
          </div>
        </div>

        {/* Out of Stock Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Out of Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-700">{summary.outOfStockCount}</div>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Zero availability</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Movement Activity Chart & Purchase Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Movement Trends (14-day Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Stock Movement Activity (Last 14 Days)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily comparison of stock received (IN) vs dispatched (OUT)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Stock IN</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Stock OUT</span>
              </span>
            </div>
          </div>

          {/* Bar Chart Bars */}
          <div className="mt-6 pt-4 h-48 flex items-end justify-between gap-1 sm:gap-2">
            {movementChart.map((day, idx) => {
              const inHeight = Math.round((day.in_qty / maxChartVal) * 100);
              const outHeight = Math.round((day.out_qty / maxChartVal) * 100);
              const dayLabel = day.date.slice(5); // MM-DD

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="flex items-end gap-1 h-36 w-full justify-center">
                    {/* IN Bar */}
                    <div
                      style={{ height: `${Math.max(4, inHeight)}%` }}
                      className="w-1.5 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-600"
                      title={`${day.date}: Received ${day.in_qty} units`}
                    />
                    {/* OUT Bar */}
                    <div
                      style={{ height: `${Math.max(4, outHeight)}%` }}
                      className="w-1.5 sm:w-2.5 bg-rose-500 rounded-t-sm transition-all group-hover:bg-rose-600"
                      title={`${day.date}: Issued ${day.out_qty} units`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium rotate-[-45deg] sm:rotate-0 mt-1">
                    {dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Order Pipeline Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>Purchase Orders</span>
              </h2>
              <Link
                to="/purchase-orders"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-medium text-slate-600">Pending / Ordered</div>
                <Badge variant="info">{poStats.pending} orders</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="text-xs font-medium text-amber-900">Partially Received</div>
                <Badge variant="warning">{poStats.partial} orders</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="text-xs font-medium text-emerald-900">Completed / Received</div>
                <Badge variant="success">{poStats.completed} orders</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-medium text-slate-600">Draft Orders</div>
                <Badge variant="default">{poStats.draft} orders</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total Procurement Value</span>
            <span className="font-extrabold text-slate-900">
              ${poStats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Critical Low Stock Items & Recent Movements Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Low Stock Action Items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Restock Priorities</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Top deficit items</p>
            </div>
            <Link
              to="/low-stock"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              See all ({summary.lowStockCount + summary.outOfStockCount})
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {criticalProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                All products meet minimum stock levels!
              </p>
            ) : (
              criticalProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                      <span className="text-[10px] text-rose-600 font-semibold">
                        {p.available_quantity} / {p.minimum_stock_level} {p.unit_of_measure}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickRestock(p.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    + Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-indigo-600" />
                <span>Recent Stock Movements</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest verified inventory logs</p>
            </div>
            <Link
              to="/movements"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Full transaction log
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Reason / User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                        {m.date}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {m.movement_type === 'IN' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                            <ArrowDownRight className="w-3 h-3" /> IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                            <ArrowUpRight className="w-3 h-3" /> OUT
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{m.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.product_sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {m.movement_type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}{' '}
                        <span className="text-slate-400 font-normal">{m.unit_of_measure}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {m.reference_number}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{m.reason}</div>
                        {m.user_name && (
                          <div className="text-[10px] text-slate-400">By {m.user_name}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Inventory Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Category Inventory Breakdown</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoryBreakdown.map((cat, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">{cat.name}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {cat.product_count} products • {cat.total_quantity} units
                </p>
              </div>
              <p className="text-sm font-extrabold text-indigo-700 mt-3">
                ${cat.valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Restock modal triggered from alert card */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setRestockProductId(undefined);
        }}
        preselectedProductId={restockProductId}
        onSuccess={fetchStats}
      />
    </div>
  );
};
