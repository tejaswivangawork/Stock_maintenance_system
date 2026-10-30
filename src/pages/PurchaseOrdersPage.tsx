import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Eye,
  FileCheck,
  PackageCheck,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from '../types/index.ts';
import { POStatusBadge } from '../components/Badge.tsx';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { ReceivePOModal } from '../components/ReceivePOModal.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export const PurchaseOrdersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();
  const canModify = hasRole('admin', 'manager');

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<{ order: PurchaseOrder; items: PurchaseOrderItem[] } | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<{ order: PurchaseOrder; items: PurchaseOrderItem[] } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);

  // Create PO Form State
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<
    Array<{ product_id: string; quantity: string; unit_price: string }>
  >([{ product_id: '', quantity: '10', unit_price: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getOrders({
        status: statusFilter || undefined,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setOrders(res.orders);
      setPagination(res.pagination);
    } catch (err: any) {
      error(err.message || 'Failed to fetch purchase orders');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm, pagination.page, pagination.limit, error]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    api.getSuppliers({ status: 'active' }).then((res) => setSuppliers(res.suppliers));
    api.getProducts({ status: 'active', limit: 100 }).then((res) => setProducts(res.products));

    const handleUpdate = () => fetchOrders();
    window.addEventListener('stock_updated', handleUpdate);
    return () => window.removeEventListener('stock_updated', handleUpdate);
  }, [fetchOrders]);

  const handleOpenCreate = () => {
    setSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : '');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setNotes('');
    setLineItems([{ product_id: '', quantity: '10', unit_price: '' }]);
    setIsCreateOpen(true);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { product_id: '', quantity: '10', unit_price: '' }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, val: string) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = val;

    // Auto-fill price if product selected
    if (field === 'product_id') {
      const matchedProd = products.find((p) => p.id === Number(val));
      if (matchedProd) {
        updated[index].unit_price = String(matchedProd.cost_price || matchedProd.unit_price);
      }
    }
    setLineItems(updated);
  };

  // Calculate total order estimate
  const calculatedTotal = lineItems.reduce((acc, curr) => {
    const q = Number(curr.quantity) || 0;
    const p = Number(curr.unit_price) || 0;
    return acc + q * p;
  }, 0);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      error('Please select a supplier');
      return;
    }

    const validItems = lineItems.filter((i) => i.product_id && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      error('Please specify at least one product with quantity > 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createOrder({
        supplier_id: Number(supplierId),
        order_date: orderDate,
        expected_delivery_date: deliveryDate || null,
        notes,
        items: validItems.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price || 0),
        })),
      });

      success(res.message);
      setIsCreateOpen(false);
      fetchOrders();
    } catch (err: any) {
      error(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewOrder = async (po: PurchaseOrder) => {
    try {
      const res = await api.getOrderById(po.id);
      setViewingOrder(res);
    } catch (err: any) {
      error(err.message || 'Failed to fetch order details');
    }
  };

  const handleOpenReceiveModal = async (po: PurchaseOrder) => {
    try {
      const res = await api.getOrderById(po.id);
      setReceivingOrder(res);
    } catch (err: any) {
      error(err.message || 'Failed to open receiving modal');
    }
  };

  const handleStatusChange = async (poId: number, newStatus: string) => {
    try {
      const res = await api.updateOrderStatus(poId, newStatus);
      success(res.message);
      fetchOrders();
    } catch (err: any) {
      error(err.message || 'Failed to update order status');
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await api.deleteOrder(orderToDelete.id);
      success('Purchase order deleted.');
      setOrderToDelete(null);
      fetchOrders();
    } catch (err: any) {
      error(err.message || 'Cannot delete purchase order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Orders (Procurement)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage replenishment workflows, track deliveries, and verify receipts
          </p>
        </div>
        {canModify && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by PO number or supplier name..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ORDERED">Ordered / Pending</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Fully Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4 text-center">Fulfillment Progress</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading purchase orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No purchase orders found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Create a procurement order using the button above
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const orderedUnits = po.total_ordered_units || 0;
                  const receivedUnits = po.total_received_units || 0;
                  const percent =
                    orderedUnits > 0 ? Math.round((receivedUnits / orderedUnits) * 100) : 0;
                  const canReceive = po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {po.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{po.supplier_name}</div>
                        <div className="text-[10px] text-slate-400">{po.supplier_email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{po.order_date}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {po.expected_delivery_date || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 100
                                  ? 'bg-emerald-500'
                                  : percent > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 text-[11px] whitespace-nowrap">
                            {receivedUnits}/{orderedUnits} ({percent}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        ${po.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <POStatusBadge status={po.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Receive Delivery Items Action */}
                          {canReceive && (
                            <button
                              onClick={() => handleOpenReceiveModal(po)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Receive Delivered Goods"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Receive</span>
                            </button>
                          )}

                          {/* View Details */}
                          <button
                            onClick={() => handleViewOrder(po)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Full PO Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cancel Order (if Ordered / Draft) */}
                          {canModify && canReceive && (
                            <button
                              onClick={() => handleStatusChange(po.id, 'CANCELLED')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancel PO"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete PO (if draft or cancelled) */}
                          {canModify && (po.status === 'DRAFT' || po.status === 'CANCELLED') && (
                            <button
                              onClick={() => setOrderToDelete(po)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.totalPages}</span> ({pagination.total}{' '}
              total orders)
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

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Purchase Order"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Order Items &amp; Quantities
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {lineItems.map((item, idx) => {
                const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70"
                  >
                    <div className="flex-1">
                      <select
                        required
                        value={item.product_id}
                        onChange={(e) => handleLineItemChange(idx, 'product_id', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-right font-medium"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="Price $"
                        value={item.unit_price}
                        onChange={(e) => handleLineItemChange(idx, 'unit_price', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-right font-medium"
                      />
                    </div>

                    <div className="w-24 text-right font-bold text-xs text-slate-800 whitespace-nowrap">
                      ${subtotal.toFixed(2)}
                    </div>

                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Remove Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-between p-3 mt-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
              <span className="font-semibold text-slate-700">Calculated PO Total</span>
              <span className="text-base font-extrabold text-indigo-700">
                ${calculatedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Procurement Notes &amp; Special Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard 30-day net payment terms. Expedite freight."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Order...' : 'Generate & Issue Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Full PO Modal */}
      {viewingOrder && (
        <Modal
          isOpen={true}
          onClose={() => setViewingOrder(null)}
          title={`Purchase Order ${viewingOrder.order.order_number}`}
          subtitle={`Status: ${viewingOrder.order.status}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Supplier</span>
                <p className="font-bold text-slate-800 mt-0.5">{viewingOrder.order.supplier_name}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Order Date</span>
                <p className="font-bold text-slate-800 mt-0.5">{viewingOrder.order.order_date}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Delivery Target</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {viewingOrder.order.expected_delivery_date || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Total Value</span>
                <p className="font-extrabold text-indigo-700 mt-0.5">
                  ${viewingOrder.order.total_amount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Ordered Line Items
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">Received</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingOrder.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{it.product_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{it.product_sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {it.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                          {it.received_quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          ${it.unit_price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                          ${it.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {viewingOrder.order.notes && (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-800">Notes: </span>
                {viewingOrder.order.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <POStatusBadge status={viewingOrder.order.status} />
              <button
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receive Items Modal */}
      {receivingOrder && (
        <ReceivePOModal
          isOpen={true}
          onClose={() => setReceivingOrder(null)}
          order={receivingOrder.order}
          items={receivingOrder.items}
          onSuccess={() => {
            fetchOrders();
            window.dispatchEvent(new CustomEvent('stock_updated'));
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={orderToDelete !== null}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleDeleteOrder}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order ${orderToDelete?.order_number}?`}
        confirmLabel="Delete"
        isDanger={true}
      />
    </div>
  );
};
