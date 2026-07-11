import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShoppingBag, 
  Wallet, 
  HelpCircle, 
  Bell, 
  MapPin, 
  CreditCard, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronRight, 
  RefreshCw, 
  Clipboard,
  MessageCircle,
  FileText,
  Gift
} from 'lucide-react';
import { useAuthStore } from '../../auth/store/auth-store';
import { useCustomerStore } from '../store/customer-store';
import { useCartStore } from '../../customer-checkout/store/cart-store';
import { useTheme } from '../../../core/theme/useTheme';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';

type TabType = 'profile' | 'orders' | 'wallet' | 'support' | 'notifications';

export const CustomerDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { theme, setTheme } = useTheme();
  const { user, clearSession, addSavedAddress } = useAuthStore();
  const { setSelectedAddress } = useCustomerStore();
  const { addItem } = useCartStore();

  // Active Tab state synced with search param
  const activeTab = (searchParams.get('tab') as TabType) || 'profile';

  // Profile Edit fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');

  // Support inputs
  const [faqOpenIdx, setFaqOpenIdx] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);

  // Address Modal form states
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrZip, setNewAddrZip] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');

  // Notifications State (Mock data)
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Order Dispatched', message: 'Ramesh is out for delivery with your fresh avocados.', date: '10 mins ago', category: 'ORDER', read: false },
    { id: '2', title: '₹50 Cashback coins credited!', message: 'Coins credited for order #98223.', date: '1 hour ago', category: 'COINS', read: false },
    { id: '3', title: 'Double coupon weekend!', message: 'Use double coupon codes during this Sunday flash hour.', date: 'Yesterday', category: 'OFFER', read: true },
    { id: '4', title: 'Secure server settings upgrade', message: 'We updated our payment encryption systems.', date: '2 days ago', category: 'SYSTEM', read: true }
  ]);

  // Orders Mock history
  const [orderHistory] = useState([
    { id: 'ORD-554231', date: '02 July 2026', total: 420, itemsCount: 3, status: 'DELIVERED', items: [
      { id: 'p1', name: 'Organic Bananas', price: 60, quantity: 2, unit: '500g' },
      { id: 'p2', name: 'Fresh Milk', price: 40, quantity: 1, unit: '500ml' }
    ]},
    { id: 'ORD-332194', date: '28 June 2026', total: 1150, itemsCount: 5, status: 'DELIVERED', items: [
      { id: 'p3', name: 'Atta Flour', price: 250, quantity: 1, unit: '5kg' },
      { id: 'p4', name: 'Daily Bread', price: 45, quantity: 1, unit: '400g' }
    ]}
  ]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast({
      type: 'success',
      title: 'Profile Updated',
      description: 'Your details have been saved to your account profile.',
    });
  };

  const handleLogout = () => {
    clearSession();
    showToast({
      type: 'success',
      title: 'Logged Out',
      description: 'Session destroyed. Redirecting to onboarding screens.',
    });
    navigate('/');
  };

  const handleAddNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet || !newAddrZip || !newAddrCity) {
      showToast({
        type: 'error',
        title: 'Form Incomplete',
        description: 'Please fill in street, ZIP code, and city.',
      });
      return;
    }
    const newAddress = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel,
      receiverName: user?.fullName || 'Customer',
      receiverPhone: user?.phone || '',
      streetAddress: newAddrStreet,
      postalCode: newAddrZip,
      city: newAddrCity,
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
    };
    addSavedAddress(newAddress);
    setSelectedAddress(newAddress);
    setShowAddAddressModal(false);
    showToast({
      type: 'success',
      title: 'Address Registered',
      description: 'Saved to coordinates list.',
    });
    setNewAddrStreet('');
    setNewAddrZip('');
    setNewAddrCity('');
  };

  const handleReorder = (itemsList: any[]) => {
    itemsList.forEach((item) => {
      // Create product mock to append
      const mockProduct = {
        id: item.id,
        name: item.name,
        description: 'Storefront item description details.',
        price: item.price,
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
        unit: item.unit,
        stock: 10,
        sku: `reorder-${item.id}`,
        categorySlug: 'grocery'
      };
      addItem(mockProduct);
    });
    showToast({
      type: 'success',
      title: 'Cart Updated',
      description: `Reordered ${itemsList.length} items to your shopping cart bag.`,
    });
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('https://aethermart.app/refer?code=AETHER50');
    showToast({
      type: 'success',
      title: 'Referral Copied',
      description: 'Your refer-and-earn registration URL copied to clipboard.',
    });
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast({
      type: 'success',
      title: 'Marked All Read',
      description: 'All notifications set to read status.',
    });
  };

  const handleDownloadInvoice = (id: string) => {
    showToast({
      type: 'success',
      title: 'Invoice Downloaded',
      description: `Tax receipt invoice for order ${id} has been downloaded.`,
    });
  };

  const handleRefundRequest = (id: string) => {
    showToast({
      type: 'success',
      title: 'Ticket Raised',
      description: `Support ticket raised for order ${id}. Refund review initiated.`,
    });
  };

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 select-none"
    >
      {/* Sidebar Navigation */}
      <div className="md:col-span-1 space-y-3.5">
        <div className="p-4 border border-border-primary rounded-2xl bg-bg-secondary flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-emerald text-white flex items-center justify-center font-heading font-extrabold text-sm uppercase">
            {fullName.charAt(0) || user?.phone.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-text-primary truncate">{fullName || 'Aether Customer'}</h3>
            <p className="text-[10px] text-text-secondary truncate font-semibold mt-0.5">{user?.phone}</p>
          </div>
        </div>

        <nav className="p-2.5 border border-border-primary rounded-2xl bg-bg-secondary space-y-1">
          {[
            { id: 'profile', label: 'Profile & Settings', icon: User },
            { id: 'orders', label: 'Order History', icon: ShoppingBag },
            { id: 'wallet', label: 'Wallet & Rewards', icon: Wallet },
            { id: 'notifications', label: 'Notification Center', icon: Bell },
            { id: 'support', label: 'Help & Support', icon: HelpCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  isSelected 
                    ? "bg-brand-emerald/10 text-brand-emerald" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Panel Content */}
      <div className="md:col-span-3">
        <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary min-h-[50vh]">
          
          {/* TAB 1: Profile & Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading border-b border-border-primary pb-3">
                Account Information
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="fullName" className="text-[10px] font-bold text-text-secondary uppercase">Full Name</label>
                    <input 
                      id="fullName"
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-[10px] font-bold text-text-secondary uppercase">Email Address</label>
                    <input 
                      id="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ramesh@domain.com"
                      className="w-full px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="py-2.5 px-6 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold rounded-xl cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

              {/* Saved Addresses list */}
              <div className="pt-6 border-t border-border-primary/60 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-4.5 w-4.5 text-brand-emerald" />
                    Saved Addresses
                  </h3>
                  <button
                    onClick={() => setShowAddAddressModal(true)}
                    className="text-xs font-extrabold text-brand-emerald hover:underline cursor-pointer"
                  >
                    + Add New
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                  {user?.savedAddresses.map((addr) => (
                    <div key={addr.id} className="p-4 rounded-xl border border-border-primary bg-bg-tertiary flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-text-primary">{addr.label}</span>
                        <p className="text-[10px] text-text-secondary mt-1">{addr.streetAddress}, {addr.city}</p>
                      </div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase">Saved</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Cards */}
              <div className="pt-6 border-t border-border-primary/60 space-y-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="h-4.5 w-4.5 text-brand-emerald" />
                  Saved Payment Methods (UI Ready)
                </h3>
                <div className="p-4 rounded-xl border border-border-primary bg-bg-tertiary flex items-center gap-3 text-xs text-text-secondary font-semibold max-w-sm">
                  <span className="text-xl">💳</span>
                  <div>
                    <p className="font-bold text-text-primary">Visa Platinum •••• 4422</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Expires 12/29</p>
                  </div>
                </div>
              </div>

              {/* Theme Settings & Language Selection */}
              <div className="pt-6 border-t border-border-primary/60 space-y-4">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">App Preferences</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  
                  {/* Theme toggles */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Theme Mode</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setTheme('light')}
                        className={cn(
                          "flex-1 py-2 border rounded-lg flex items-center justify-center gap-1.5 cursor-pointer",
                          theme === 'light' ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary"
                        )}
                      >
                        <Sun className="h-3.5 w-3.5" /> Light
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "flex-1 py-2 border rounded-lg flex items-center justify-center gap-1.5 cursor-pointer",
                          theme === 'dark' ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary"
                        )}
                      >
                        <Moon className="h-3.5 w-3.5" /> Dark
                      </button>
                    </div>
                  </div>

                  {/* Language selection */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Language</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setLanguage('EN')}
                        className={cn(
                          "flex-1 py-2 border rounded-lg cursor-pointer",
                          language === 'EN' ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary"
                        )}
                      >
                        English
                      </button>
                      <button 
                        onClick={() => setLanguage('HI')}
                        className={cn(
                          "flex-1 py-2 border rounded-lg cursor-pointer",
                          language === 'HI' ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary"
                        )}
                      >
                        हिन्दी (Hindi)
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Logout button */}
              <div className="pt-6 border-t border-border-primary/60">
                <button
                  onClick={handleLogout}
                  className="py-3 px-6 border border-status-error/30 hover:bg-status-error/5 text-status-error font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  Logout Session
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: Order History */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading border-b border-border-primary pb-3">
                Order History & Invoices
              </h2>

              <div className="space-y-4">
                {orderHistory.map((order) => (
                  <div key={order.id} className="p-4 rounded-xl border border-border-primary bg-bg-tertiary/60 space-y-3 text-xs font-semibold">
                    <div className="flex items-center justify-between border-b border-border-primary/60 pb-2">
                      <div>
                        <span className="text-text-primary font-bold">{order.id}</span>
                        <span className="text-[10px] text-text-secondary block font-semibold mt-0.5">{order.date}</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald rounded uppercase">
                        {order.status}
                      </span>
                    </div>

                    {/* Items brief */}
                    <div className="text-text-secondary text-[11px] space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name} ({item.unit}) x {item.quantity}</span>
                          <span className="text-text-primary font-heading">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border-primary/60 pt-2 flex items-center justify-between">
                      <span className="font-extrabold text-text-primary">Total: {formatCurrency(order.total)}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownloadInvoice(order.id)}
                          className="px-2.5 py-1.5 border border-border-primary bg-bg-secondary hover:bg-bg-primary rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" /> Invoice
                        </button>
                        <button 
                          onClick={() => handleRefundRequest(order.id)}
                          className="px-2.5 py-1.5 border border-border-primary bg-bg-secondary hover:bg-bg-primary rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer flex items-center gap-1"
                        >
                          Return / Refund
                        </button>
                        <button 
                          onClick={() => handleReorder(order.items)}
                          className="px-3 py-1.5 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="h-3 w-3" /> Reorder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Wallet & Rewards */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading border-b border-border-primary pb-3">
                Wallet & Rewards
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Wallet Balance */}
                <div className="p-5 rounded-2xl border border-brand-emerald/20 bg-brand-emerald/5 flex flex-col justify-between h-36">
                  <span className="text-xs font-bold text-brand-emerald uppercase tracking-wider">Aether Wallet Cash</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-text-primary font-heading">₹350.00</span>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-1">100% usable on checkout</p>
                  </div>
                </div>

                {/* Loyalty coins */}
                <div className="p-5 rounded-2xl border border-brand-violet/20 bg-brand-violet/5 flex flex-col justify-between h-36">
                  <span className="text-xs font-bold text-brand-violet uppercase tracking-wider">Loyalty Points</span>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-text-primary font-heading">1,240 Coins</span>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-1">Value: ₹12.40 credits</p>
                  </div>
                </div>
              </div>

              {/* Refer and earn panel */}
              <div className="p-5 rounded-2xl border border-border-primary bg-bg-tertiary space-y-3">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="h-4.5 w-4.5 text-brand-emerald" />
                  Refer & Earn Free Groceries
                </h3>
                <p className="text-[11px] text-text-secondary leading-relaxed font-semibold">
                  Invite your neighborhood coordinates! They get ₹100 discount credits on first login, and you get ₹100 once their checkouts clear.
                </p>
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    readOnly
                    value="https://aethermart.app/refer?code=AETHER50"
                    className="flex-1 px-3 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-secondary select-all"
                  />
                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Clipboard className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notification Center */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border-primary pb-3">
                <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">
                  Notification Center
                </h2>
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs font-extrabold text-brand-emerald hover:underline cursor-pointer"
                >
                  Mark All Read
                </button>
              </div>

              <div className="divide-y divide-border-primary text-xs font-semibold text-text-secondary">
                {notifications.map((n) => (
                  <div key={n.id} className={cn("py-4 flex gap-4 items-start transition-colors", !n.read && "bg-brand-emerald/5 p-3 rounded-xl border border-brand-emerald/10 mt-2")}>
                    <div className={cn(
                      "p-2 rounded-lg bg-bg-tertiary text-text-secondary",
                      !n.read && "bg-brand-emerald/15 text-brand-emerald"
                    )}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="font-extrabold text-text-primary">{n.title}</h4>
                        <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">{n.date}</span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Help & Support */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading border-b border-border-primary pb-3">
                Help & Customer Support
              </h2>

              {/* Live channel buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowChatModal(true)}
                  className="p-4 rounded-xl border border-border-primary bg-bg-tertiary flex items-center justify-between text-left hover:border-text-secondary cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="font-extrabold text-text-primary">Chat Support (UI Ready)</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Average reply timeline: under 60 secs</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </button>

                <button 
                  onClick={() => showToast({ type: 'success', title: 'Calling Support', description: 'Dialing center phone lines...' })}
                  className="p-4 rounded-xl border border-border-primary bg-bg-tertiary flex items-center justify-between text-left hover:border-text-secondary cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="font-extrabold text-text-primary">Phone Call Support (UI Ready)</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">Masked voice routing</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </button>
              </div>

              {/* FAQs Accordion */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Frequently Asked Questions</span>
                {[
                  { q: 'How does Aether Mart promise 10-minute delivery?', a: 'We distribute catalog units across neighborhood dark stores within a 2-kilometer delivery radius. When you checkout, a rider is auto-matched and orders are packed in under 2 minutes.' },
                  { q: 'What is the organic replacement guarantee?', a: 'If any produce arrives spoiled, open a ticket via the Return/Refund button in order history to initiate a direct wallet cash credit back to your account.' },
                  { q: 'Can I cancel an active transit order?', a: 'No. Once the rider is out for delivery with the catalog items, orders cannot be cancelled to ensure rider security.' }
                ].map((item, idx) => {
                  const isOpen = faqOpenIdx === idx;
                  return (
                    <div key={idx} className="border border-border-primary rounded-xl overflow-hidden bg-bg-tertiary">
                      <button
                        onClick={() => setFaqOpenIdx(isOpen ? null : idx)}
                        className="w-full p-4 flex justify-between items-center text-xs font-bold text-text-primary text-left cursor-pointer"
                      >
                        <span>{item.q}</span>
                        <ChevronRight className={cn("h-4 w-4 text-text-secondary transition-all", isOpen && "rotate-90")} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-[11px] text-text-secondary leading-relaxed border-t border-border-primary/40 pt-2 font-semibold">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Address Form Modal */}
      <AnimatePresence>
        {showAddAddressModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4"
            >
              <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Add Address Coordinates</h3>
              <form onSubmit={handleAddNewAddress} className="space-y-3.5 text-xs font-semibold">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Label</span>
                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddrLabel(lbl)}
                        className={cn(
                          "flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all",
                          newAddrLabel === lbl ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary bg-bg-tertiary"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="newAddrStreet" className="text-[10px] font-bold text-text-secondary uppercase">Street Address</label>
                  <input
                    id="newAddrStreet"
                    placeholder="123 Fresh Lane, Sector 4"
                    value={newAddrStreet}
                    onChange={(e) => setNewAddrStreet(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="newAddrZip" className="text-[10px] font-bold text-text-secondary uppercase">PIN Code</label>
                    <input
                      id="newAddrZip"
                      placeholder="560034"
                      value={newAddrZip}
                      onChange={(e) => setNewAddrZip(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="newAddrCity" className="text-[10px] font-bold text-text-secondary uppercase">City</label>
                    <input
                      id="newAddrCity"
                      placeholder="Bengaluru"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(false)}
                    className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald-hover rounded-xl cursor-pointer"
                  >
                    Save Coordinates
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Support Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border-primary pb-2.5">
                <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-1.5">
                  <MessageCircle className="h-4.5 w-4.5 text-brand-emerald" />
                  Live Chat Support
                </h3>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase">Online</span>
              </div>

              {/* Chat messages */}
              <div className="h-48 overflow-y-auto bg-bg-tertiary rounded-xl p-3 text-xs space-y-3 font-semibold text-text-secondary">
                <div className="p-2.5 rounded-lg bg-bg-secondary max-w-[80%] text-left border border-border-primary">
                  Hello! How can Aether support assist you with your active coordinate delivery today?
                </div>
                {supportMessage && (
                  <div className="p-2.5 rounded-lg bg-brand-emerald text-white max-w-[80%] ml-auto text-right">
                    {supportMessage}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type message to agent..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      showToast({ type: 'success', title: 'Message Sent', description: 'Transmitting encrypted packet...' });
                      setSupportMessage('');
                    }
                  }}
                />
                <button
                  onClick={() => setShowChatModal(false)}
                  className="px-4 py-2 border border-border-primary rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default CustomerDashboardPage;
