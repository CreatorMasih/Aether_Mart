import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, Trash2, Settings, ShieldAlert, Package, ShoppingBag, Truck, DollarSign } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'STOCK' | 'SYSTEM' | 'PAYMENT' | 'DELIVERY';
  createdAt: string;
  isRead: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_NOTIFICATIONS: AppNotificationItem[] = [
  {
    id: 'n-1',
    title: 'New Order Received! 🛒',
    message: 'Order #ORD-2026-9021 (₹499) placed by Customer Rahul S.',
    type: 'ORDER',
    createdAt: '2 mins ago',
    isRead: false,
  },
  {
    id: 'n-2',
    title: 'Low Stock Alert ⚠️',
    message: 'Fresh Strawberries 250g Box has reached threshold (3 units left).',
    type: 'STOCK',
    createdAt: '15 mins ago',
    isRead: false,
  },
  {
    id: 'n-3',
    title: 'Rider Assigned 🚴',
    message: 'Rider Vikram K. assigned for Order #ORD-2026-8812.',
    type: 'DELIVERY',
    createdAt: '1 hour ago',
    isRead: true,
  },
  {
    id: 'n-4',
    title: 'Payment Credited 💳',
    message: 'Weekly payout of ₹12,450 successfully transferred to HDFC Bank.',
    type: 'PAYMENT',
    createdAt: 'Yesterday',
    isRead: true,
  },
];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'PREFS'>('ALL');

  // Preferences states
  const [enablePush, setEnablePush] = useState(true);
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableWhatsapp, setEnableWhatsapp] = useState(true);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: AppNotificationItem['type']) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-brand-primary" />;
      case 'STOCK':
        return <ShieldAlert className="w-4 h-4 text-warning" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4 text-accent-teal" />;
      case 'PAYMENT':
        return <DollarSign className="w-4 h-4 text-success" />;
      default:
        return <Package className="w-4 h-4 text-text-secondary" />;
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    activeTab === 'UNREAD' ? !n.isRead : true
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-md bg-surface border-l border-border h-full flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-text-primary">Notifications</h2>
            </div>

            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all flex items-center space-x-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Read all</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-border rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-Header Navigation Tabs */}
          <div className="flex items-center border-b border-border px-4 py-2 space-x-2 bg-surface-subtle">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                activeTab === 'ALL'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                activeTab === 'UNREAD'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('PREFS')}
              className={cn(
                'ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1',
                activeTab === 'PREFS'
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Channels</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeTab === 'PREFS' ? (
              <div className="space-y-4 bg-surface-subtle p-4 rounded-2xl border border-border">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Notification Channel Setup
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Push Notifications</p>
                      <p className="text-[10px] text-text-secondary">Instant browser & mobile alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enablePush}
                      onChange={(e) => setEnablePush(e.target.checked)}
                      className="w-4 h-4 accent-brand-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Email Notifications</p>
                      <p className="text-[10px] text-text-secondary">Daily summaries and invoice receipts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableEmail}
                      onChange={(e) => setEnableEmail(e.target.checked)}
                      className="w-4 h-4 accent-brand-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">WhatsApp Notifications</p>
                      <p className="text-[10px] text-text-secondary">Order updates directly on WhatsApp</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableWhatsapp}
                      onChange={(e) => setEnableWhatsapp(e.target.checked)}
                      className="w-4 h-4 accent-brand-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                <Bell className="w-8 h-8 text-text-secondary/40 mb-2" />
                <p className="text-xs font-semibold text-text-secondary">No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all relative group flex items-start space-x-3',
                    item.isRead
                      ? 'bg-surface border-border opacity-80'
                      : 'bg-brand-primary/5 border-brand-primary/20 ring-1 ring-brand-primary/10'
                  )}
                >
                  <div className="p-2 bg-surface-subtle rounded-xl border border-border shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-text-primary">{item.title}</h4>
                      <span className="text-[10px] font-medium text-text-secondary">{item.createdAt}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-normal">{item.message}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-error transition-all"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
