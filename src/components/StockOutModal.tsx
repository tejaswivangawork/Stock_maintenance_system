import React, { useState, useEffect } from 'react';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedProductId?: number;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedProductId,
}) => {
  const { success, error } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [reason, setReason] = useState<string>('Customer Order Fulfillment');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      api.getProducts({ limit: 100, status: 'active' }).then((res) => {
        setProducts(res.products);
        if (preselectedProductId) {
          setProductId(String(preselectedProductId));
        }
      });
      setReferenceNumber(`OUT-${Date.now().toString().slice(-6)}`);
    }
  }, [isOpen, preselectedProductId]);

  const selectedProduct = products.find((p) => p.id === Number(productId));
  const enteredQty = Number(quantity);
  const isInsufficient = selectedProduct ? enteredQty > selectedProduct.available_quantity : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      error('Please select a product');
      return;
    }

    if (isNaN(enteredQty) || enteredQty <= 0) {
      error('Please enter a valid positive quantity to issue');
      return;
    }

    if (isInsufficient) {
      error(
        `Insufficient inventory! Only ${selectedProduct?.available_quantity} available, but ${enteredQty} was requested.`
      );
      return;
    }

    if (!reason.trim()) {
      error('Please specify a stock-out reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.stockOut({
        product_id: Number(productId),
        quantity: enteredQty,
        reference_number: referenceNumber,
        reason,
        date,
        notes,
      });

      success(res.message);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to process stock out operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Stock Out (Inventory Dispatch)" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Product <span className="text-rose-500">*</span>
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">-- Choose a Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.available_quantity === 0}>
                {p.name} ({p.sku}) — Available: {p.available_quantity} {p.unit_of_measure}{' '}
                {p.available_quantity === 0 ? '(OUT OF STOCK)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Live Stock Level & Insufficient Warning */}
        {selectedProduct && (
          <div
            className={`rounded-xl p-3 text-xs border ${
              isInsufficient
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500">Available in Stock: </span>
                <span className="font-bold text-slate-900">
                  {selectedProduct.available_quantity} {selectedProduct.unit_of_measure}
                </span>
              </div>
              {enteredQty > 0 && !isInsufficient && (
                <div className="text-indigo-700 font-bold">
                  → Remaining after dispatch: {selectedProduct.available_quantity - enteredQty}{' '}
                  {selectedProduct.unit_of_measure}
                </div>
              )}
            </div>

            {isInsufficient && (
              <div className="flex items-center gap-1.5 mt-2 font-semibold text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Insufficient stock! You cannot dispatch {enteredQty} units when only{' '}
                  {selectedProduct.available_quantity} are in stock.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to Issue <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedProduct ? selectedProduct.available_quantity : undefined}
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 ${
                isInsufficient
                  ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
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
              placeholder="e.g. SO-8841 or REQ-220"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Dispatch <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Customer Order Fulfillment">Customer Order Fulfillment</option>
              <option value="Internal Assembly / Production">Internal Assembly / Production</option>
              <option value="Damaged / Scrap Write-off">Damaged / Scrap Write-off</option>
              <option value="Return to Vendor">Return to Vendor</option>
              <option value="Inventory Audit Shortage">Inventory Audit Shortage</option>
              <option value="Sample / Testing Usage">Sample / Testing Usage</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dispatch Date <span className="text-rose-500">*</span>
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
            Dispatch Notes &amp; Destination
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Issued to Assembly Bay 2 for Project Titan"
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
            disabled={isSubmitting || isInsufficient || enteredQty <= 0}
            className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{isSubmitting ? 'Issuing...' : 'Confirm Stock Out'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
