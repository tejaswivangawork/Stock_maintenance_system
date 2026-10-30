import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  ClipboardList,
  DollarSign,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

type ReportType =
  | 'inventory'
  | 'stock-in'
  | 'stock-out'
  | 'low-stock'
  | 'purchase-orders'
  | 'valuation';

export const ReportsPage: React.FC = () => {
  const { error, success } = useToast();
  const [activeReport, setActiveReport] = useState<ReportType>('inventory');
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReportData(activeReport, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setRecords(res.records);
    } catch (err: any) {
      error(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, startDate, endDate]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const filename = `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
      await api.downloadReportCSV(activeReport, { start_date: startDate, end_date: endDate }, filename);
      success(`Report downloaded as ${filename}`);
    } catch (err: any) {
      error(err.message || 'Failed to download CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const reportTabs: Array<{ id: ReportType; label: string; icon: React.FC<any> }> = [
    { id: 'inventory', label: 'Inventory Master', icon: Package },
    { id: 'stock-in', label: 'Stock-In History', icon: ArrowDownRight },
    { id: 'stock-out', label: 'Stock-Out Dispatches', icon: ArrowUpRight },
    { id: 'low-stock', label: 'Low Stock Shortages', icon: AlertTriangle },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'valuation', label: 'Valuation by Category', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports &amp; Business Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit inventory health, analyze movement turnover, and export data for accounting
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={isExporting || isLoading || records.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Date Filter Bar for transactional reports */}
      {(activeReport === 'stock-in' ||
        activeReport === 'stock-out' ||
        activeReport === 'purchase-orders') && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Date Range Filter:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer ml-auto"
            >
              Clear Dates
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeReport === 'inventory' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Retail Valuation</th>
                  <th className="py-3 px-4 text-right">Cost Valuation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">{r.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.sku}</td>
                    <td className="py-3 px-4 text-slate-600">{r.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {r.available_quantity} {r.unit_of_measure}
                    </td>
                    <td className="py-3 px-4 text-right">${Number(r.unit_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      ${Number(r.cost_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      ${Number(r.retail_valuation).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ${Number(r.cost_valuation).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[10px] uppercase text-slate-600">
                      {r.stock_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'stock-in' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-right">Qty Received</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-700">{r.date}</td>
                    <td className="py-3 px-4 font-mono font-medium text-indigo-700">
                      {r.reference_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.product_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.sku}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      +{r.quantity}
                    </td>
                    <td className="py-3 px-4 text-right">${Number(r.unit_price || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${Number(r.total_value).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.supplier_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'stock-out' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-right">Qty Issued</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-700">{r.date}</td>
                    <td className="py-3 px-4 font-mono font-medium text-rose-700">
                      {r.reference_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.product_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.sku}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-700">
                      -{r.quantity}
                    </td>
                    <td className="py-3 px-4 text-right">${Number(r.unit_price || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${Number(r.total_value).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{r.reason}</td>
                    <td className="py-3 px-4 text-slate-600">{r.issued_by || 'Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'low-stock' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Min. Threshold</th>
                  <th className="py-3 px-4 text-center">Deficit Qty</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Est. Reorder Cost</th>
                  <th className="py-3 px-4 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">{r.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.sku}</td>
                    <td className="py-3 px-4 text-slate-600">{r.category}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-700">
                      {r.available_quantity} {r.unit_of_measure}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {r.minimum_stock_level} {r.unit_of_measure}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-rose-700">
                      -{r.deficit_quantity} {r.unit_of_measure}
                    </td>
                    <td className="py-3 px-4 text-right">${Number(r.cost_price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ${Number(r.estimated_reorder_cost).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[10px] text-amber-800 uppercase">
                      {r.alert_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'purchase-orders' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4 text-center">Fulfillment</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{r.order_number}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.supplier}</td>
                    <td className="py-3 px-4 text-slate-600">{r.order_date}</td>
                    <td className="py-3 px-4 text-slate-600">{r.expected_delivery_date || '—'}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {r.total_units_received} / {r.total_units_ordered} units
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ${Number(r.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[10px] uppercase text-indigo-700">
                      {r.status}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.created_by || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'valuation' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Active Catalog Items</th>
                  <th className="py-3 px-4 text-center">Total Stock Units</th>
                  <th className="py-3 px-4 text-right">Cost Valuation ($)</th>
                  <th className="py-3 px-4 text-right">Retail Valuation ($)</th>
                  <th className="py-3 px-4 text-right">Potential Gross Profit ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.category_name}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {r.total_items}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                      {r.total_stock_units}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ${Number(r.total_cost_value).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-indigo-700">
                      ${Number(r.total_retail_value).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ${Number(r.potential_profit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {records.length === 0 && !isLoading && (
          <div className="py-12 text-center text-slate-400">
            <p className="font-semibold text-slate-700">No records found for this report</p>
          </div>
        )}
      </div>
    </div>
  );
};
