import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  User as UserIcon, 
  CheckSquare, 
  Square, 
  Check, 
  ChevronRight, 
  Printer, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { merchantService } from '../services/merchant-service';
import { socketService } from '../../../core/socket/socket-service';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

type OrderStatusFilter = 'NEW' | 'PREPARING' | 'PACKING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export const MerchantOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<OrderStatusFilter>('NEW');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
        title: 'New Order Received',
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
        title: 'Order Updated',
        description: `Order successfully transitioned to ${data.status}.`,
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Transition Failed',
        description: err.message || 'Unable to update order status.',
      });
    }
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

  // Initialize/reset checklists when active order switches
  useEffect(() => {
    if (activeOrder) {
      setCheckedItems([]);
    }
  }, [activeOrder]);

  const handlePrintReceipt = (id: string) => {
    alert(`Routing receipt package to print queue for order ${id}.`);
  };

  const toggleCheckItemLocal = (productId: string) => {
    setCheckedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  if (ordersLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-semibold text-text-secondary select-none">
        Loading storefront orders history...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* Left 2 columns: Tabs & Orders Listing */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Navigation Tab Bar */}
        <div className="flex overflow-x-auto border-b border-border-primary/60 bg-bg-secondary/40 rounded-xl p-1.5 gap-1 select-none">
          {[
            { id: 'NEW', label: 'New' },
            { id: 'PREPARING', label: 'Accepted' },
            { id: 'PACKING', label: 'Packing' },
            { id: 'READY', label: 'Ready' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedOrderId(null);
              }}
              className={cn(
                "px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-brand-emerald text-white" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
            >
              {tab.label} ({orders.filter(o => {
                if (tab.id === 'NEW') return o.status === 'PLACED';
                if (tab.id === 'PREPARING') return o.status === 'CONFIRMED';
                if (tab.id === 'PACKING') return o.status === 'PACKING';
                if (tab.id === 'READY') return o.status === 'READY_FOR_PICKUP';
                if (tab.id === 'COMPLETED') return o.status === 'DELIVERED';
                return o.status === 'CANCELLED';
              }).length})
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="space-y-3">
          {filteredOrders.map((o) => {
            const isSelected = activeOrder?.id === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border flex justify-between items-center transition-all cursor-pointer",
                  isSelected 
                    ? "border-brand-emerald bg-brand-emerald/5 text-text-primary" 
                    : "border-border-primary bg-bg-secondary hover:border-text-secondary"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{o.orderNumber}</span>
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                      {o.createdAt}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary font-bold truncate max-w-xs uppercase">
                    {o.items.length} Items • {formatCurrency(o.totalAmount)}
                  </p>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-text-secondary" />
              </button>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="p-8 text-center border border-dashed border-border-primary rounded-xl text-text-secondary">
              No orders queued in this segment status.
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Active Order Details console */}
      <div className="lg:col-span-1">
        {activeOrder ? (
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-5">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-border-primary/60 pb-3">
              <div>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Active order card</span>
                <h3 className="text-sm font-extrabold text-text-primary mt-0.5">{activeOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => handlePrintReceipt(activeOrder.id)}
                className="p-2 border border-border-primary rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary cursor-pointer"
                title="Print Receipt"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Customer Coordinates</span>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <UserIcon className="h-4 w-4 text-text-secondary" />
                  <span className="font-bold text-text-primary">{activeOrder.deliveryAddress.receiverName}</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <MapPin className="h-4 w-4 text-text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-text-secondary font-semibold leading-relaxed">
                    {activeOrder.deliveryAddress.streetAddress}, {activeOrder.deliveryAddress.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Order items lists & checklists */}
            <div className="space-y-3 pt-3 border-t border-border-primary/60">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Packing Checklist</span>
              
              <div className="space-y-2">
                {activeOrder.items.map((item) => {
                  const isChecked = checkedItems.includes(item.productId);
                  const isPackingMode = activeOrder.status === 'PACKING';

                  return (
                    <div 
                      key={item.productId} 
                      onClick={() => isPackingMode && toggleCheckItemLocal(item.productId)}
                      className={cn(
                        "p-3 rounded-xl border border-border-primary flex items-center justify-between transition-colors",
                        isChecked ? "bg-brand-emerald/5 border-brand-emerald/20" : "bg-bg-tertiary/40",
                        isPackingMode && "cursor-pointer hover:border-text-secondary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {isPackingMode ? (
                          isChecked ? (
                            <CheckSquare className="h-4 w-4 text-brand-emerald" />
                          ) : (
                            <Square className="h-4 w-4 text-text-secondary" />
                          )
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-brand-emerald" />
                        )}
                        <div>
                          <p className="font-bold text-text-primary">{item.productName}</p>
                          <p className="text-[9px] text-text-secondary mt-0.5 font-bold uppercase tracking-wider">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-heading font-extrabold text-text-primary">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage operations button trigger */}
            <div className="pt-4 border-t border-border-primary/60 space-y-2">
              {activeOrder.status === 'PLACED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'CONFIRMED' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold text-xs rounded-xl shadow-subtle cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Accept Order
                </button>
              )}

              {activeOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'PACKING' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3 bg-brand-violet hover:bg-brand-violet-hover text-white font-bold text-xs rounded-xl shadow-subtle cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="h-4 w-4" /> Start Packing Checklist
                </button>
              )}

              {activeOrder.status === 'PACKING' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'READY_FOR_PICKUP' })}
                  disabled={updateStatusMutation.isPending || checkedItems.length < activeOrder.items.length}
                  className="w-full py-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold text-xs rounded-xl shadow-subtle cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" /> Finish Packing & Ready for Pickup
                </button>
              )}

              {activeOrder.status === 'READY_FOR_PICKUP' && (
                <div className="p-3 rounded-xl bg-brand-emerald/10 text-brand-emerald text-center font-bold text-xs border border-brand-emerald/20 flex items-center justify-center gap-1.5">
                  <Clock className="h-4 w-4 animate-spin text-brand-emerald" />
                  Awaiting rider assignment dispatch
                </div>
              )}

              {/* Cancel order line */}
              {activeOrder.status !== 'DELIVERED' && activeOrder.status !== 'CANCELLED' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: activeOrder.id, status: 'CANCELLED' })}
                  disabled={updateStatusMutation.isPending}
                  className="w-full py-3 border border-status-error/30 hover:bg-status-error/5 text-status-error font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" /> Cancel Order
                </button>
              )}
            </div>

          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-border-primary rounded-xl text-text-secondary">
            Select an order to view checklists and dispatch details.
          </div>
        )}
      </div>

    </div>
  );
};

export default MerchantOrders;
