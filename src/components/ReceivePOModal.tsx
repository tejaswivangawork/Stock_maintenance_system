import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { PurchaseOrder, PurchaseOrderItem } from '../types/index.ts';

interface ReceivePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  items: PurchaseOrderItem[];
  onSuccess: () => void;
}

export const ReceivePOModal: React.FC<ReceivePOModalProps> = ({
  isOpen,
  onClose,
  order,
  items,
  onSuccess,
}) => {
  const { success, error } = useToast();
  // Map item_id to quantity being received right now
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [deliveryDate, setDeliveryDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize receiving quantities with outstanding quantities by default
  React.useEffect(() => {
    if (isOpen && items) {
      const initial: Record<number, number> = {};
      items.forEach((it) => {
        const remaining = it.quantity - it.received_quantity;
        initial[it.id] = remaining > 0 ? remaining : 0;
      });
      setReceiveQuantities(initial);
    }
  }, [isOpen, items]);

  if (!order) return null;

  const handleQtyChange = (itemId: number, maxAllowed: number, value: string) => {
    const num = Math.max(0, Math.min(maxAllowed, Number(value) || 0));
    setReceiveQuantities((prev) => ({
      ...prev,
      [itemId]: num,
    }));
  };

  const handleReceiveAllOutstanding = () => {
    const filled: Record<number, number> = {};
    items.forEach((it) => {
      filled[it.id] = Math.max(0, it.quantity - it.received_quantity);
    });
    setReceiveQuantities(filled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsPayload = items
      .map((it) => ({
        item_id: it.id,
        quantity_to_receive: receiveQuantities[it.id] || 0,
      }))
      .filter((it) => it.quantity_to_receive > 0);

    if (itemsPayload.length === 0) {
      error('Please specify a quantity to receive for at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.receiveOrderItems(order.id, {
        items: itemsPayload,
        delivery_date: deliveryDate,
        notes,
      });

      success(res.message);
      onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to process item delivery receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Products — ${order.order_number}`}
      subtitle={`Supplier: ${order.supplier_name || 'N/A'}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <p className="text-xs text-slate-500">
            Enter the quantity delivered for each line item. Partial deliveries are fully supported.
          </p>
          <button
            type="button"
            onClick={handleReceiveAllOutstanding}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Auto-fill all remaining
          </button>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3 text-center">Ordered</th>
                <th className="py-2.5 px-3 text-center">Prev. Received</th>
                <th className="py-2.5 px-3 text-center">Outstanding</th>
                <th className="py-2.5 px-3 text-right">Qty to Receive Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const remaining = item.quantity - item.received_quantity;
                const isFullyReceived = remaining <= 0;
                const currentInputVal = receiveQuantities[item.id] ?? 0;

                return (
                  <tr
                    key={item.id}
                    className={isFullyReceived ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/80'}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{item.product_name}</div>
                      <div className="text-[11px] text-slate-400">{item.product_sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                      {item.received_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                      {remaining}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isFullyReceived ? (
                        <span className="text-[11px] font-semibold text-emerald-600">Complete</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            step="1"
                            value={currentInputVal}
                            onChange={(e) => handleQtyChange(item.id, remaining, e.target.value)}
                            className="w-20 px-2.5 py-1.5 text-right font-semibold bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                          <span className="text-slate-400 text-[11px]">/ {remaining}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Delivery Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspection / Delivery Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Carrier packing slip #8824"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

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
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Updating Inventory...' : 'Receive & Update Inventory'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
