import React, { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { USER_ROLES } from '../core/config/constants';
import { useAuthStore } from '../features/auth/store/auth-store';
import { ModalContainer } from '../components/ui/modal-manager/ModalContainer';
import { DrawerContainer } from '../components/ui/drawer-manager/DrawerContainer';

// Layout shells
import CustomerLayout from '../components/layout/CustomerLayout';
import MerchantLayout from '../components/layout/MerchantLayout';
import RiderLayout from '../components/layout/RiderLayout';
import AdminLayout from '../components/layout/AdminLayout';

// Root layout that exposes the react-router context to overlays
const RootLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <ModalContainer />
      <DrawerContainer />
    </>
  );
};

// Lazy loaded page components
const OnboardingScreen = lazy(() => import('../features/auth/components/OnboardingScreen'));
const AuthScreen = lazy(() => import('../features/auth/components/AuthScreen'));
const ProfileSetupScreen = lazy(() => import('../features/auth/components/ProfileSetupScreen'));

const HomeScreen = lazy(() => import('../features/customer-catalog/components/HomeScreen'));
const ProductListingPage = lazy(() => import('../features/customer-catalog/components/ProductListingPage'));
const ProductDetailPage = lazy(() => import('../features/customer-catalog/components/ProductDetailPage'));
const StoreDetailsPage = lazy(() => import('../features/customer-catalog/components/StoreDetailsPage'));

const CheckoutPage = lazy(() => import('../features/customer-checkout/components/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('../features/customer-checkout/components/OrderConfirmationPage'));
const LiveOrderTrackingPage = lazy(() => import('../features/customer-checkout/components/LiveOrderTrackingPage'));
const CustomerDashboardPage = lazy(() => import('../features/customer-catalog/components/CustomerDashboardPage'));

const MerchantDashboard = lazy(() => import('../features/merchant/components/MerchantDashboard').then((m) => ({ default: m.MerchantDashboard })));
const MerchantOrders = lazy(() => import('../features/merchant/components/MerchantOrders').then((m) => ({ default: m.MerchantOrders })));
const MerchantCatalog = lazy(() => import('../features/merchant/components/MerchantCatalog').then((m) => ({ default: m.MerchantCatalog })));
const MerchantInventory = lazy(() => import('../features/merchant/components/MerchantInventory').then((m) => ({ default: m.MerchantInventory })));
const StoreProfileEditor = lazy(() => import('../features/merchant/components/StoreProfileEditor').then((m) => ({ default: m.StoreProfileEditor })));

const RiderDashboard = lazy(() => import('../features/rider/components/RiderDashboard'));
const RiderJobActive = lazy(() => import('../features/rider/components/RiderJobActive'));

const AdminDashboard = lazy(() => import('../features/admin/components/AdminDashboard'));
const AdminUsers = lazy(() => import('../features/admin/components/AdminUsers'));

// Suspense wrapper helper
const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="h-6 w-6 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
    </div>
  }>
    <Component />
  </Suspense>
);

// Simple Landing/Role Resolution component
const RoleResolver: React.FC = () => {
  const { isAuthenticated, user, activeRole } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/welcome" replace />;
  }

  if (!user.fullName && activeRole !== 'ADMIN') {
    return <Navigate to="/auth/profile-setup" replace />;
  }

  switch (activeRole) {
    case 'SHOPKEEPER':
      return <Navigate to="/m/dashboard" replace />;
    case 'RIDER':
      return <Navigate to="/r/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/a/dashboard" replace />;
    case 'CUSTOMER':
    default:
      return <Navigate to="/c/home" replace />;
  }
};

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <RoleResolver />,
      },
      {
        path: '/welcome',
        element: withSuspense(OnboardingScreen),
      },
      {
        path: '/auth',
        element: withSuspense(AuthScreen),
      },
      {
        path: '/auth/profile-setup',
        element: withSuspense(ProfileSetupScreen),
      },
      
      // Customer Protected Routes
      {
        path: '/c',
        element: (
          <ProtectedRoute allowedRoles={[USER_ROLES.CUSTOMER]}>
            <CustomerLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '', element: <Navigate to="home" replace /> },
          {
            path: 'home',
            element: withSuspense(HomeScreen),
          },
          {
            path: 'search',
            element: withSuspense(ProductListingPage),
          },
          {
            path: 'category/:slug',
            element: withSuspense(ProductListingPage),
          },
          {
            path: 'product/:slug',
            element: withSuspense(ProductDetailPage),
          },
          {
            path: 'store/:storeId',
            element: withSuspense(StoreDetailsPage),
          },
          {
            path: 'checkout',
            element: withSuspense(CheckoutPage),
          },
          {
            path: 'orders/confirm',
            element: withSuspense(OrderConfirmationPage),
          },
          {
            path: 'orders/track/:id',
            element: withSuspense(LiveOrderTrackingPage),
          },
          {
            path: 'profile',
            element: withSuspense(CustomerDashboardPage),
          },
          {
            path: 'account',
            element: withSuspense(CustomerDashboardPage),
          },
          {
            path: 'profile/insights',
            element: withSuspense(CustomerDashboardPage),
          },
        ],
      },
      
      // Merchant Protected Routes
      {
        path: '/m',
        element: (
          <ProtectedRoute allowedRoles={[USER_ROLES.SHOPKEEPER]}>
            <MerchantLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '', element: <Navigate to="dashboard" replace /> },
          {
            path: 'dashboard',
            element: withSuspense(MerchantDashboard),
          },
          {
            path: 'orders',
            element: withSuspense(MerchantOrders),
          },
          {
            path: 'catalog',
            element: withSuspense(MerchantCatalog),
          },
          {
            path: 'inventory',
            element: withSuspense(MerchantInventory),
          },
          {
            path: 'profile',
            element: withSuspense(StoreProfileEditor),
          },
          {
            path: 'store',
            element: withSuspense(StoreProfileEditor),
          },
        ],
      },
      
      // Rider Protected Routes
      {
        path: '/r',
        element: (
          <ProtectedRoute allowedRoles={[USER_ROLES.RIDER]}>
            <RiderLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '', element: <Navigate to="dashboard" replace /> },
          {
            path: 'dashboard',
            element: withSuspense(RiderDashboard),
          },
          {
            path: 'active',
            element: withSuspense(RiderJobActive),
          },
        ],
      },
      
      // Admin Protected Routes
      {
        path: '/a',
        element: (
          <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '', element: <Navigate to="dashboard" replace /> },
          {
            path: 'dashboard',
            element: withSuspense(AdminDashboard),
          },
          {
            path: 'users',
            element: withSuspense(AdminUsers),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ]
  }
];
