import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  User as UserIcon,
  CheckSquare,
  Square,
  Printer,
  FileText,
  Phone,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { merchantService } from '../services/merchant-service';
import { socketService } from '../../../core/socket/socket-service';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

type OrderStatusFilter = 'NEW' | 'PREPARING' | 'PACKING' | 'READY' | 'COMPLETED' | 'CANCELLED';

const REJECT_REASONS = [
  'Items out of stock',
  'Store currently closed / busy',
  'Delivery address outside radius',
  'Customer requested cancellation',
];

export const MerchantOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('NEW');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Reject Modal state
  const [rejectOrderTarget, setRejectOrderTarget] = useState<any | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECT_REASONS[0]);

  // Local Packing Checklist state
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  // 1. Fetch live storefront orders
  const { data: storeOrders, isLoading: ordersLoading } = useQuery({
    queryKey: queryKeys.merchantOrders(),
    queryFn: () => merchantService.getStoreOrders(),
  });

  const orders = storeOrders ?? [];

  // 2. Real-time Sockets Listeners
  useEffect(() => {
    const handleNewOrder = (order: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({
        type: 'info',
        title: 'New Order Received! 🛒',
        description: `Order ${order.orderNumber} is pending review.`,
      });
    };

    const handleStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
    };

    socketService.on('merchant:new_order', handleNewOrder);
    socketService.on('order:status_update', handleStatusUpdate);

    return () => {
      socketService.off('merchant:new_order', handleNewOrder);
      socketService.off('order:status_update', handleStatusUpdate);
    };
  }, [queryClient, showToast]);

  // 3. Status Transition Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      merchantService.updateOrderStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantOrders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({
        type: 'success',
        title: 'Order Status Updated',
        description: `Order successfully transitioned to ${data.status}.`,
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Transition Failed',
        description: err.message || 'Unable to update order status.',
      });
    },
  });

  // Filtered orders list depending on tab selection
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'NEW') return o.status === 'PLACED';
    if (activeTab === 'PREPARING') return o.status === 'CONFIRMED';
    if (activeTab === 'PACKING') return o.status === 'PACKING';
    if (activeTab === 'READY') return o.status === 'READY_FOR_PICKUP';
    if (activeTab === 'COMPLETED') return o.status === 'DELIVERED';
    return o.status === 'CANCELLED';
  });

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  useEffect(() => {
    if (activeOrder) {
      setCheckedItems([]);
    }
  }, [activeOrder?.id]);

  const toggleCheckItemLocal = (productId: string) => {
    setCheckedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #111827; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; }
            .meta { font-size: 12px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
            .total { text-align: right; font-weight: bold; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div className="header">
            <div className="title">AETHER MART STORE INVOICE</div>
            <div className="meta">Order Number: ${order.orderNumber}</div>
            <div className="meta">Date: ${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <strong>Customer:</strong> ${order.customer?.fullName || 'Customer'}<br/>
            <strong>Payment Method:</strong> ${order.paymentMethod || 'COD'} (${order.paymentStatus || 'PENDING'})
          </div>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (item: any) => `
                <tr>
                  <td>${item.productName || 'Item'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unitPrice}</td>
                  <td>₹${item.quantity * item.unitPrice}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div className="total">
            Total Amount Paid: ₹${order.totalAmount || 0}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintPackingSlip = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Packing Slip - ${order.orderNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #111827; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .box { border: 1px solid #000; padding: 10px; font-size: 12px; margin-bottom: 15px; }
            ul { list-style: none; padding: 0; }
            li { font-size: 14px; padding: 6px 0; border-bottom: 1px dashed #ccc; }
          </style>
        </head>
        <body>
          <div className="header">
            <h2>KIRANA STORE PACKING SLIP</h2>
            <p>Order: <strong>${order.orderNumber}</strong></p>
          </div>
          <div className="box">
            <strong>Customer Delivery Notes:</strong> ${order.deliveryInstruction || 'None'}
          </div>
          <h3>Items to Pack:</h3>
          <ul>
            ${(order.items || [])
              .map(
                (item: any) => `
              <li>[  ] <strong>${item.quantity}x</strong> ${item.productName || 'Item'} (${item.variantLabel || 'Standard'})</li>
            `
              )
              .join('')}
          </ul>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRejectConfirm = () => {
    if (!rejectOrderTarget) return;
    updateStatusMutation.mutate({ id: rejectOrderTarget.id, status: 'CANCELLED' });
    setRejectOrderTarget(null);
  };

  if (ordersLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="h-64 bg-border/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 text-xs">
      {/* Left 2 columns: Navigation Tabs & Orders List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-border bg-surface rounded-2xl p-1.5 gap-1 shadow-xs">
          {[
            { id: 'NEW', label: 'New Orders' },
            { id: 'PREPARING', label: 'Accepted' },
            { id: 'PACKING', label: 'Packing' },
            { id: 'READY', label: 'Ready' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => {
            const count = orders.filter((o) => {
              if (tab.id === 'NEW') return o.status === 'PLACED';
              if (tab.id === 'PREPARING') return o.status === 'CONFIRMED';
              if (tab.id === 'PACKING') return o.status === 'PACKING';
              if (tab.id === 'READY') return o.status === 'READY_FOR_PICKUP';
              if (tab.id === 'COMPLETED') return o.status === 'DELIVERED';
              return o.status === 'CANCELLED';
            }).length;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedOrderId(null);
                }}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5',
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px]',
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-primary'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filtered Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="h-64 bg-surface border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-6">
            <ShoppingBag className="w-8 h-8 text-text-secondary/40 mb-2" />
            <p className="text-sm font-bold text-text-primary">No orders in this state</p>
            <p className="text-xs text-text-secondary max-w-xs mt-1">
              New orders placed by nearby customers will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => {
              const isSelected = activeOrder?.id === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={cn(
                    'p-4 bg-surface border rounded-2xl transition-all cursor-pointer space-y-3',
                    isSelected
                      ? 'border-brand-primary ring-2 ring-brand-primary/20 shadow-md'
                      : 'border-border hover:border-brand-primary/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-text-primary text-sm">{order.orderNumber}</span>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-brand-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>{order.items?.length || 1} items to pack</span>
                    <span className="font-semibold text-text-primary bg-surface-subtle px-2 py-0.5 rounded-md border border-border">
                      {order.paymentMethod || 'COD'} ({order.paymentStatus || 'PENDING'})
                    </span>
                  </div>

                  {/* Immediate Action Buttons */}
                  {order.status === 'PLACED' && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({ id: order.id, status: 'CONFIRMED' });
                        }}
                        className="flex-1 py-2 bg-success text-white font-bold rounded-xl shadow-xs hover:bg-success/90 transition-all text-xs"
                      >
                        Accept Order
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectOrderTarget(order);
                        }}
                        className="py-2 px-4 bg-error/10 text-error hover:bg-error/20 font-bold rounded-xl transition-all text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Selected Order Detail, Checklist & Timeline */}
      <div className="space-y-4">
        {activeOrder ? (
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 sticky top-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{activeOrder.orderNumber}</h3>
                <p className="text-[10px] text-text-secondary">
                  Placed on {new Date(activeOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePrintPackingSlip(activeOrder)}
                  title="Print Packing Slip"
                  className="p-2 text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border rounded-xl transition-all"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePrintInvoice(activeOrder)}
                  title="Print Tax Invoice"
                  className="p-2 text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-border rounded-xl transition-all"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3 bg-surface-subtle rounded-xl border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary text-xs flex items-center space-x-1">
                  <UserIcon className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{(activeOrder as any)?.customer?.fullName || 'Customer'}</span>
                </span>

                <a
                  href={`tel:${(activeOrder as any)?.customer?.user?.phone || '+919999999999'}`}
                  className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-bold flex items-center space-x-1 hover:bg-brand-primary/20"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call Customer</span>
                </a>
              </div>

              {(activeOrder as any)?.deliveryInstruction && (
                <p className="text-[10px] text-warning font-medium italic pt-1">
                  Note: "{(activeOrder as any)?.deliveryInstruction}"
                </p>
              )}
            </div>

            {/* Packing Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider">
                  Packing Checklist ({checkedItems.length}/{(activeOrder.items || []).length})
                </span>
                {(activeOrder.items || []).length > 1 && checkedItems.length < (activeOrder.items || []).length && (
                  <button
                    onClick={() => setCheckedItems((activeOrder.items || []).map((i: any) => i.productId))}
                    className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                  >
                    Mark All Packed
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(activeOrder.items || []).map((item: any) => {
                  const isChecked = checkedItems.includes(item.productId);
                  return (
                    <div
                      key={item.id || item.productId}
                      onClick={() => toggleCheckItemLocal(item.productId)}
                      className={cn(
                        'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between',
                        isChecked
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'bg-surface-subtle border-border text-text-primary'
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        {isChecked ? <CheckSquare className="w-4 h-4 text-success" /> : <Square className="w-4 h-4 text-text-secondary" />}
                        <span className={cn('text-xs font-semibold', isChecked && 'line-through opacity-70')}>
                          {item.quantity}x {item.productName || 'Item'}
                        </span>
                      </div>
                      <span className="font-bold text-xs">₹{item.unitPrice * item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workflow Action Button — Desktop & Main Panel */}
            <div className="pt-2 border-t border-border">
              {activeOrder.status === 'PLACED' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'CONFIRMED' })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 py-3 bg-success text-white font-extrabold rounded-xl shadow-md hover:bg-success/90 transition-all text-xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>✓ ACCEPT ORDER</span>
                  </button>
                  <button
                    onClick={() => setRejectOrderTarget(activeOrder)}
                    className="py-3 px-4 bg-error/10 text-error hover:bg-error/20 font-bold rounded-xl transition-all text-xs cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}

              {activeOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'PACKING' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3 bg-brand-primary text-white font-extrabold rounded-xl shadow-md hover:bg-brand-primary/90 transition-all text-xs cursor-pointer"
                >
                  START PREPARING
                </button>
              )}

              {activeOrder.status === 'PACKING' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'READY_FOR_PICKUP' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3 bg-success text-white font-extrabold rounded-xl shadow-md hover:bg-success/90 transition-all text-xs cursor-pointer"
                >
                  ✓ READY FOR PICKUP
                </button>
              )}

              {activeOrder.status === 'READY_FOR_PICKUP' && (
                <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-center">
                  <span className="text-xs font-bold text-brand-primary flex items-center justify-center space-x-1.5">
                    <span>🛵 Waiting for rider assignment...</span>
                  </span>
                </div>
              )}

              {['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(activeOrder.status) && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-center">
                  <span className="text-xs font-bold text-success flex items-center justify-center space-x-1.5">
                    <span>🛵 Rider has picked up the order — Out for delivery</span>
                  </span>
                </div>
              )}

              {activeOrder.status === 'DELIVERED' && (
                <div className="p-3 bg-surface-subtle border border-border rounded-xl text-center">
                  <span className="text-xs font-bold text-text-secondary">✓ Order delivered successfully</span>
                </div>
              )}
            </div>

            {/* Mobile Sticky Bottom CTA Container */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border z-40 shadow-2xl space-y-2">
              {activeOrder.status === 'PLACED' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'CONFIRMED' })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 py-3.5 bg-success text-white font-extrabold rounded-xl shadow-lg text-sm cursor-pointer"
                  >
                    ✓ ACCEPT ORDER
                  </button>
                  <button
                    onClick={() => setRejectOrderTarget(activeOrder)}
                    className="py-3.5 px-4 bg-error/10 text-error font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              )}

              {activeOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'PACKING' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3.5 bg-brand-primary text-white font-extrabold rounded-xl shadow-lg text-sm cursor-pointer"
                >
                  START PREPARING
                </button>
              )}

              {activeOrder.status === 'PACKING' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'READY_FOR_PICKUP' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3.5 bg-success text-white font-extrabold rounded-xl shadow-lg text-sm cursor-pointer"
                >
                  ✓ READY FOR PICKUP
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-64 bg-surface border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="w-8 h-8 text-text-secondary/40 mb-2" />
            <p className="text-xs font-semibold text-text-secondary">Select an order to view packing details</p>
          </div>
        )}
      </div>

      {/* REJECT REASON MODAL */}
      <AnimatePresence>
        {rejectOrderTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-text-primary">Reject Order</h3>
                <button onClick={() => setRejectOrderTarget(null)} className="p-1 text-text-secondary hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Please select a reason for rejecting order {rejectOrderTarget.orderNumber}:
                </p>

                <div className="space-y-2">
                  {REJECT_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer flex items-center space-x-2 text-xs font-semibold transition-all',
                        selectedRejectReason === reason
                          ? 'bg-error/10 border-error/30 text-error'
                          : 'bg-surface-subtle border-border text-text-primary'
                      )}
                    >
                      <input
                        type="radio"
                        name="rejectReason"
                        checked={selectedRejectReason === reason}
                        onChange={() => setSelectedRejectReason(reason)}
                        className="accent-error cursor-pointer"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRejectOrderTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary bg-surface-subtle hover:bg-border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  className="px-4 py-2 text-xs font-bold text-white bg-error hover:bg-error/90 rounded-xl shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
