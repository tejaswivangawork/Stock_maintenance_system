import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  XCircle,
  ArrowDownRight,
  TrendingDown,
  DollarSign,
  Package,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { StockInModal } from '../components/StockInModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const LowStockPage: React.FC = () => {
  const { error } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [outOfStockCount, setOutOfStockCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Quick Restock Modal
  const [restockProductId, setRestockProductId] = useState<number | undefined>(undefined);
  const [isStockInOpen, setIsStockInOpen] = useState(false);

  const fetchLowStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getLowStockProducts();
      setItems(res.lowStockProducts);
      setOutOfStockCount(res.outOfStockCount);
    } catch (err: any) {
      error(err.message || 'Failed to fetch low stock alerts');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchLowStock();
    const handleUpdate = () => fetchLowStock();
    window.addEventListener('stock_updated', handleUpdate);
    return () => window.removeEventListener('stock_updated', handleUpdate);
  }, [fetchLowStock]);

  const handleRestock = (productId: number) => {
    setRestockProductId(productId);
    setIsStockInOpen(true);
  };

  // Summary figures
  const totalDeficitUnits = items.reduce((acc, curr) => acc + (curr.deficit_quantity || 0), 0);
  const totalEstReorderCost = items.reduce(
    (acc, curr) => acc + (curr.deficit_quantity || 0) * (curr.cost_price || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Low Stock &amp; Inventory Alerts</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Proactive alert center monitoring stock deficits against minimum replenishment thresholds
        </p>
      </div>

      {/* Alert KPI Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Items In Alert</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-700">{items.length}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Below required minimum</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Critical Depleted</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-700">{outOfStockCount}</div>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Out of stock (0 units)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Deficit Units</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalDeficitUnits}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Units needed to reach min level</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Est. Restock Cost</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              ${totalEstReorderCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Based on unit cost</p>
          </div>
        </div>
      </div>

      {/* Alert Items List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Deficit Inventory Matrix</h3>
          <span className="text-xs text-slate-400 font-medium">Sorted by severity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Min. Threshold</th>
                <th className="py-3 px-4 text-center">Deficit</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">Est. Reorder Cost</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading alert items...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    <p className="font-semibold text-slate-800">Inventory Levels Optimal!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No products currently fall below their required minimum reorder threshold.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const isOut = it.available_quantity === 0;
                  const itemReorderCost = (it.deficit_quantity || 0) * (it.cost_price || 0);

                  return (
                    <tr
                      key={it.id}
                      className={
                        isOut
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 transition-colors'
                          : 'hover:bg-amber-50/30 transition-colors'
                      }
                    >
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full text-[11px] border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{it.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{it.category_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-extrabold text-sm ${
                            isOut ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          {it.available_quantity}
                        </span>{' '}
                        <span className="text-slate-400 text-[10px]">{it.unit_of_measure}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">
                        {it.minimum_stock_level} {it.unit_of_measure}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-rose-700">
                        -{it.deficit_quantity} {it.unit_of_measure}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {it.supplier_name || <span className="text-slate-400 italic">None</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        ${itemReorderCost.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRestock(it.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Stock In</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setRestockProductId(undefined);
        }}
        preselectedProductId={restockProductId}
        onSuccess={fetchLowStock}
      />
    </div>
  );
};
