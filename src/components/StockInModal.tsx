import React, { useState, useEffect } from 'react';
import { ArrowDownRight } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedProductId?: number;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedProductId,
}) => {
  const { success, error } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [reason, setReason] = useState<string>('Restock Delivery');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      api.getProducts({ limit: 100, status: 'active' }).then((res) => {
        setProducts(res.products);
        if (preselectedProductId) {
          setProductId(String(preselectedProductId));
          const match = res.products.find((p: any) => p.id === preselectedProductId);
          if (match) {
            setUnitCost(String(match.cost_price || ''));
            if (match.supplier_id) setSupplierId(String(match.supplier_id));
          }
        }
      });
      api.getSuppliers({ status: 'active' }).then((res) => {
        setSuppliers(res.suppliers);
      });
      setReferenceNumber(`IN-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, preselectedProductId]);

  const selectedProduct = products.find((p) => p.id === Number(productId));

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setProductId(id);
    const prod = products.find((p) => p.id === Number(id));
    if (prod) {
      setUnitCost(String(prod.cost_price || ''));
      if (prod.supplier_id) {
        setSupplierId(String(prod.supplier_id));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      error('Please select a product');
      return;
    }
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      error('Please enter a valid quantity greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.stockIn({
        product_id: Number(productId),
        quantity: qty,
        unit_price: unitCost ? Number(unitCost) : undefined,
        supplier_id: supplierId ? Number(supplierId) : undefined,
        reference_number: referenceNumber,
        reason,
        date,
        notes,
      });

      success(res.message);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to process stock in operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Stock In (Inventory Receipt)" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Product <span className="text-rose-500">*</span>
          </label>
          <select
            value={productId}
            onChange={handleProductChange}
            required
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">-- Choose a Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Available: {p.available_quantity} {p.unit_of_measure}
              </option>
            ))}
          </select>
        </div>

        {/* Live Current & Predicted Stock Indicator */}
        {selectedProduct && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Current Stock: </span>
              <span className="font-bold text-slate-800">
                {selectedProduct.available_quantity} {selectedProduct.unit_of_measure}
              </span>
            </div>
            {Number(quantity) > 0 && (
              <div className="text-emerald-700 font-bold">
                → New Projected Stock: {selectedProduct.available_quantity + Number(quantity)}{' '}
                {selectedProduct.unit_of_measure}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity Received <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Unit Cost */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g. 15.50"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">-- Direct / Unknown Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. PO-9812 or INV-1002"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Category</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Restock Delivery">Restock Delivery</option>
              <option value="Purchase Order Receipt">Purchase Order Receipt</option>
              <option value="Customer Return">Customer Return</option>
              <option value="Audit Surplus Adjustment">Audit Surplus Adjustment</option>
              <option value="Transfer In">Transfer In</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes &amp; Quality Inspection
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Batch #401 arrived with verified seal"
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{isSubmitting ? 'Receiving...' : 'Confirm Stock In'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
