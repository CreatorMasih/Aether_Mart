import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerHeader } from '../../features/customer-catalog/components/CustomerHeader';
import { BottomNavBar } from '../../features/customer-catalog/components/BottomNavBar';
import { useDrawerStore } from '../ui/drawer-manager/drawer-store';

export const CustomerLayout: React.FC = () => {
  const openDrawer = useDrawerStore((state) => state.openDrawer);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary pb-16 md:pb-0">
      {/* Universal Customer Header */}
      <CustomerHeader onNotificationClick={() => openDrawer('NOTIFICATIONS')} />

      {/* Main viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Sticky Bottom Navigation (Mobile & Tablet) */}
      <BottomNavBar />
    </div>
  );
};

export default CustomerLayout;
