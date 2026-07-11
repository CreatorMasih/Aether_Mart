# Aether Mart - Hyperlocal Commerce Platform

Aether Mart is a premium, startup-grade, production-ready hyperlocal commerce platform built with React 19, Vite, Tailwind CSS, Framer Motion, and TypeScript. The platform coordinates operations between four major user personas (Customers, Store Merchants, Delivery Partners, and Super Admins) in real-time.

---

## 🚀 Key Features

### 🛒 Customer Storefront
- **Live Location Engine**: Automatic gps coordinate geolocation tracking with Bangalore pincode constraints (56xxxx).
- **Infinite Catalog Listing**: Fast grids & list view modes with organic, price, and category filters.
- **Smart Cart Reservations**: 15-minute item reservation countdown timers with split store-origin groupings.
- **Live Order Timeline Tracker**: Interactive SVG maps displaying rider tracking milestones.
- **Settings tab**: Language selector (English/Hindi), Wallet payouts balance, and profile configs.

### 🏪 Merchant Portal (Store Dashboard)
- **Revenue Analytics**: Metric cards tracking GMV today, average cart value, and settlements.
- **Active Orders Packing Checklist**: Step-by-step checklists to verify items before rider dispatch.
- **Catalog Management**: Form panels to add, edit, and delete products with SKU generation and low-stock indicators.
- **Payout Settlement ledger**: Full history logs mapping bank transfers.

### 🚴 Rider Console (Delivery Partner App)
- **Shift Management**: Shift active timers and online/offline status switches.
- **Interactive Routing Navigator**: SVG maps simulating turn-by-turn routes between stores and customer homes.
- **OTP Verification handovers**: Pickup OTP checking from stores and dropoff OTP from customers.
- **Proof of Delivery**: Signature collection pads and camera photo upload boxes (UI Ready).
- **High safety SOS alarms**: Instant SOS broadcasting to dispatchers.

### 👑 Super Admin Panel (Admin Command Center)
- **Executive summary statistics**: Revenue growth percentages, total orders, and dispatch logs feeds.
- **Global Settings configurations**: Platform fee modifiers, delivery commission overrides, and maintenance toggles.
- **Feature Flags command desk**: Peak hour price surge toggle and dynamic geo-routing engine switch.
- **User verification portals**: Approved store documentation review tables, rider KYC, and customer blocking flags.
- **Chronological Audit logs**: Audit history timestamp tables recording administrative events.

---

## 📁 Enterprise Folder Structure

The project implements a **feature-first, decoupled architecture** separating code scopes by business domains to ensure merchant, rider, and admin scripts never pollute the customer bundle.

```
src/
├── components/          # Reusable shared UI widgets (modals, drawers, loaders, error boundaries)
│   └── layout/          # Layout Shells (CustomerLayout, MerchantLayout, RiderLayout, AdminLayout)
├── core/                # Core configurations, design tokens, and theme providers
│   ├── theme/           # useTheme light/dark settings
│   └── config/          # Constant variables, endpoints, and preset arrays
├── features/            # Isolated business domain modules
│   ├── auth/            # OTP verifier form pages and profile completions
│   ├── customer-catalog/# Search inputs, listing layout, detail specification sheets
│   ├── customer-checkout/# Address selectors, scheduled time slots, and confirmation checkmarks
│   ├── merchant/        # Store overview logs, active checklist tables, catalog edit modals
│   ├── rider/           # Shifts triggers, dispatch list, and verification OTP components
│   └── admin/           # Platform settings forms and user verification lists
├── hooks/               # Shared hooks (toast prompts, offline trackers, media queries)
├── router/              # Lazy loading path navigators (routes.tsx, ProtectedRoute.tsx)
├── types/               # Type-safe type definitions (index.ts)
└── utils/               # Helper modules (cn, formatters, local storage)
```

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: React 19 + Vite
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion (lazy-chunked)
- **State Management**: Zustand (persistent local caching)
- **Validation**: React Hook Form + Zod schemas
- **Icons**: Lucide React (split vendor chunked)

---

## 💻 Developer Setup Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
1. Clone the project repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the hot-reloading development server:
   ```bash
   npm run dev
   ```
Open `http://localhost:5173` in your browser.

### Building for Production
To bundle and optimize the application with manual vendor splitting:
   ```bash
   npm run build
   ```
Vite will compile the code, compress the styles, and split bundles under `dist/` directory.

### Previewing the Production Build
To spin up a local server hosting the compiled production assets:
   ```bash
   npm run preview
   ```

---

## 🔒 Environment Variables

Store your configuration settings in a `.env` file at the project root:

```env
# API client endpoint url
VITE_API_BASE_URL=http://localhost:4000/api/v1

# Map Provider credentials
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here

# Enable mock services override (true in development)
VITE_USE_MOCK_SERVICES=true
```
