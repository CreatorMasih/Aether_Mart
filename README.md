# Aether Mart - Hyperlocal Commerce Platform

Aether Mart is a premium, startup-grade, production-ready hyperlocal commerce platform built with React, Vite, Express, TypeScript, and PostgreSQL. The platform coordinates operations between four major user personas (Customers, Store Merchants, Delivery Partners, and Super Admins) in real-time.

---

## 🚀 Key Features

### 🛒 Customer Storefront
- **Live Location Engine:** Automatic GPS coordinate geolocation tracking with Bangalore pincode constraints (56xxxx).
- **Infinite Catalog Listing:** Fast grids & list view modes with organic, price, and category filters.
- **Smart Cart Reservations:** 15-minute item reservation countdown timers with split store-origin groupings.
- **Live Order Timeline Tracker:** Interactive SVG maps displaying real-time rider tracking milestones.
- **Settings Tab:** Language selector (English/Hindi), Wallet payouts balance, and profile configs.

### 🏪 Merchant Portal (Store Dashboard)
- **Revenue Analytics:** Metric cards tracking GMV today, average cart value, and settlements.
- **Active Orders Packing Checklist:** Step-by-step checklists to verify items before rider dispatch.
- **Catalog Management:** Form panels to add, edit, and delete products with SKU generation and low-stock indicators.
- **Payout Settlement Ledger:** Full history logs mapping bank transfers.

### 🚴 Rider Console (Delivery Partner App)
- **Shift Management:** Shift active timers and online/offline status switches.
- **Interactive Routing Navigator:** SVG maps simulating turn-by-turn routes between stores and customer homes.
- **OTP Verification Handovers:** Pickup OTP checking from stores and dropoff OTP from customers.
- **Proof of Delivery:** Signature collection pads and camera photo upload boxes (UI Ready).
- **High-Safety SOS Alarms:** Instant SOS broadcasting to dispatchers.

### 👑 Super Admin Panel (Admin Command Center)
- **Executive Summary Statistics:** Revenue growth percentages, total orders, and dispatch logs feeds.
- **Global Settings Configurations:** Platform fee modifiers, delivery commission overrides, and maintenance toggles.
- **Feature Flags Command Desk:** Peak hour price surge toggle and dynamic geo-routing engine switch.
- **User Verification Portals:** Approved store documentation review tables, rider KYC, and customer blocking flags.
- **Chronological Audit Logs:** Audit history timestamp tables recording administrative events.

---

## 📁 Repository Folder Structure

The project implements a **feature-first, decoupled architecture** separating code scopes by business domains to ensure merchant, rider, and admin scripts never pollute the customer bundle.

```
├── .github/             # GitHub workflow pipelines
├── dist/                # Compiled production bundles (gitignored)
├── nginx.conf           # Production Nginx reverse-proxy setup
├── Dockerfile           # Frontend Multistage Docker builder
├── docker-compose.yml   # Multi-container orchestration configurations
├── production.env.example # Template for environment configurations
├── src/                 # Client React Source
│   ├── components/      # Shared UI components (modals, drawers, layout containers)
│   ├── core/            # Configuration files, theme systems, and network wrappers
│   ├── features/        # Business feature capsules (auth, catalog, checkout, merchant, rider, admin)
│   ├── hooks/           # Custom reusable react hooks
│   ├── router/          # Router guards and layout routing tables
│   ├── types/           # Type-safe type definitions
│   └── utils/           # Mappers, formatters, and geolocation utilities
└── server/              # Backend Express Source
    ├── src/             # Express API source code
    │   ├── common/      # Authentication, CORS, error, and rate-limiting middlewares
    │   ├── config/      # Database client wrappers (Prisma, Redis, Cloudinary)
    │   ├── modules/     # Domain business units (auth, catalog, cart, customer, merchant, rider, admin, order)
    │   ├── socket/      # Tracking heartbeat and routing notification events
    │   └── utils/       # Shared formatting mappers
    ├── prisma/          # Database migrations, seed scripts, and schema files
    ├── Dockerfile       # Backend container compiler
    └── package.json     # Node script configuration manager
```

---

## 🛠️ Tech Stack & Dependencies

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript (Strict Mode)
- **State Management:** Zustand (persistent local caching)
- **Validation:** React Hook Form + Zod schemas
- **Styling:** Vanilla CSS + Tailwind CSS

### Backend
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Databases:** PostgreSQL, Redis
- **Real-time Channel:** Socket.IO
- **Validation:** Zod

---

## 💻 Local Development Setup Guide

### Prerequisites
- Node.js (v18.0.0 or higher)
- PostgreSQL Database Engine
- Redis Server (Optional, automatically falls back to in-memory cache)

### Step 1: Install Dependencies
Run from the repository root:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file at the root level for the frontend:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Create a `.env` file in the `server/` directory for the backend:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/aether_mart_db?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET="use-a-strong-random-hex-key"
REFRESH_TOKEN_SECRET="use-a-different-strong-random-hex-key"
ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"
COOKIE_SECRET="cookie-signing-passphrase"
```

### Step 3: Run Database Migrations & Seeding
Navigate to the `server/` folder and run:
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate dev --name init

# Populate database seeds
npx prisma db seed
```

### Step 4: Launch Dev Servers
To run the project locally:
```bash
# Start backend server (from /server folder)
npm run dev

# Start frontend application (from root folder)
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Production Deployment

To run the entire ecosystem in production using containers:

1. Clone the project and configure the production environment parameters:
   ```bash
   cp production.env.example .env
   ```
2. Build and launch all services in detached mode:
   ```bash
   docker compose up -d --build
   ```
3. Run migrations and database seeds:
   ```bash
   docker compose exec api-server npx prisma migrate deploy
   ```
4. Access the web interface on port `80`.
