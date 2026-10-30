import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { StockMovement } from '../types/index.ts';
import { StockInModal } from '../components/StockInModal.tsx';
import { StockOutModal } from '../components/StockOutModal.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const StockMovementsPage: React.FC = () => {
  const { error } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [movementType, setMovementType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getMovements({
        movement_type: movementType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setMovements(res.movements);
      setPagination(res.pagination);
    } catch (err: any) {
      error(err.message || 'Failed to fetch stock movements');
    } finally {
      setIsLoading(false);
    }
  }, [movementType, startDate, endDate, searchTerm, pagination.page, pagination.limit, error]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    const handleUpdate = () => fetchMovements();
    window.addEventListener('stock_updated', handleUpdate);
    return () => window.removeEventListener('stock_updated', handleUpdate);
  }, [fetchMovements]);

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Stock Movements Audit Log</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable transaction records of all inventory receipts and dispatches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStockInOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Record Stock In</span>
          </button>
          <button
            onClick={() => setIsStockOutOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Record Stock Out</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, reference, reason..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Movement Types (IN &amp; OUT)</option>
              <option value="IN">Stock IN (Receipts &amp; Deliveries)</option>
              <option value="OUT">Stock OUT (Dispatches &amp; Usage)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4">Transaction Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Supplier / Partner</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading movement history...</span>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No stock movements found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Log inventory receipts or issues using the buttons above
                    </p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {m.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {m.movement_type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
                          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>STOCK IN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 text-xs">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          <span>STOCK OUT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.product_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{m.product_sku}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span
                        className={`text-sm font-extrabold ${
                          m.movement_type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {m.movement_type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {m.unit_of_measure}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {m.reference_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{m.reason}</div>
                      {m.notes && (
                        <div className="text-[11px] text-slate-400 max-w-xs truncate">{m.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.supplier_name || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {m.user_name || <span className="text-slate-400">System</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total}{' '}
              total logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={fetchMovements}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        onSuccess={fetchMovements}
      />
    </div>
  );
};
