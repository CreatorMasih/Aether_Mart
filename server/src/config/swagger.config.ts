import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Aether Mart Hyperlocal Commerce API',
    version: '1.0.0',
    description: `
# Aether Mart — Production OpenAPI 3.0 Specification

Interactive API documentation for Aether Mart hyperlocal grocery delivery platform.

### Key Features:
- **Multi-Role RBAC**: Customer, Shopkeeper (Merchant), Rider, Super Admin.
- **Hyperlocal Geolocation**: Distance-based store visibility & delivery radius checks.
- **Real-Time Sockets**: Instant order notifications and rider GPS tracking.
- **OTP & OAuth Authentication**: Phone OTP, Email OTP, Google One-Tap.

### Quick Start with "Try it out":
1. Call \`POST /api/auth/send-otp\` to request a verification OTP.
2. Call \`POST /api/auth/verify-otp\` to verify and receive a Bearer Access Token.
3. Click the **Authorize** button at the top right, enter \`Bearer <your_token>\`, and click **Authorize**.
4. Test protected endpoints directly from the browser!
    `.trim(),
    contact: {
      name: 'Aether Mart Engineering',
      email: 'support@aethermart.com',
      url: 'https://aether-mart-six.vercel.app',
    },
    license: {
      name: 'Proprietary',
      url: 'https://aethermart.com/terms',
    },
  },
  servers: [
    {
      url: 'https://aether-mart.onrender.com/api',
      description: 'Live Production Server (Render)',
    },
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
    {
      url: '/api',
      description: 'Relative API Base Path',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User login, OTP verification, Google OAuth, and JWT session refresh' },
    { name: 'Customers', description: 'Customer profile management, addresses, and saved locations' },
    { name: 'Categories', description: 'Taxonomy categories, subcategories, and hierarchy' },
    { name: 'Products', description: 'Product catalog search, SKU lookup, multi-angle images, and details' },
    { name: 'Store', description: 'Store profiles, business hours, delivery radius, and store status toggles' },
    { name: 'Merchant', description: 'Merchant dashboard analytics, order processing, and payout ledgers' },
    { name: 'Inventory', description: 'Stock levels, stock adjustments, and low stock threshold alerts' },
    { name: 'Orders', description: 'Order placement, status transitions, timeline tracking, and invoice printing' },
    { name: 'Riders', description: 'Rider job assignments, GPS heartbeat tracking, pickup OTP, and delivery OTP' },
    { name: 'Dashboard', description: 'Admin platform metrics, revenue overview, and feature configurations' },
    { name: 'Notifications', description: 'Universal push, email, and WhatsApp notification preferences' },
    { name: 'Uploads', description: 'Media file uploads and image asset management' },
    { name: 'Location', description: 'Reverse geocoding, pin drop validation, and Haversine distance calculations' },
    { name: 'Postal', description: 'Indian 6-digit PINCODE lookup and city auto-completion' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token obtained via /auth/verify-otp or /auth/google-login',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_PAYLOAD' },
              message: { type: 'string', example: 'Request parameters validation failed' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
          phone: { type: 'string', example: '+919999999999' },
          email: { type: 'string', example: 'user@aethermart.com' },
          role: { type: 'string', enum: ['CUSTOMER', 'SHOPKEEPER', 'RIDER', 'ADMIN'], example: 'SHOPKEEPER' },
          status: { type: 'string', example: 'ACTIVE' },
          isVerified: { type: 'boolean', example: true },
        },
      },
      Store: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Green Kirana Superstore' },
          address: { type: 'string', example: '8th Main Road, Koramangala, Bangalore' },
          latitude: { type: 'number', example: 12.9716 },
          longitude: { type: 'number', example: 77.5946 },
          deliveryRadiusKm: { type: 'number', example: 5.0 },
          minimumOrderValue: { type: 'number', example: 100 },
          isOpen: { type: 'boolean', example: true },
          isPaused: { type: 'boolean', example: false },
          openingTime: { type: 'string', example: '08:00' },
          closingTime: { type: 'string', example: '22:00' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Fresh Strawberries 250g Box' },
          sku: { type: 'string', example: 'AM-FRU-0001' },
          price: { type: 'number', example: 129 },
          mrp: { type: 'number', example: 149 },
          stock: { type: 'integer', example: 25 },
          isVegetarian: { type: 'boolean', example: true },
          isOrganic: { type: 'boolean', example: false },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'ORD-84920' },
          status: { type: 'string', enum: ['PLACED', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED'] },
          totalAmount: { type: 'number', example: 349 },
          paymentMethod: { type: 'string', example: 'COD' },
          paymentStatus: { type: 'string', example: 'PAID' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token missing, expired, or invalid',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      ForbiddenError: {
        description: 'User lacks required role permission',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFoundError: {
        description: 'Requested entity was not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    // ── 1. AUTHENTICATION ───────────────────────────────────────────────────
    '/auth/send-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Send Verification OTP',
        description: 'Dispatches a 6-digit OTP code to the requested phone number or email.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'type', 'role'],
                properties: {
                  identifier: { type: 'string', example: '+919999999999' },
                  type: { type: 'string', enum: ['SMS', 'EMAIL'], example: 'SMS' },
                  role: { type: 'string', enum: ['CUSTOMER', 'SHOPKEEPER', 'RIDER', 'ADMIN'], example: 'CUSTOMER' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP dispatched successfully',
            content: {
              'application/json': {
                example: { success: true, message: 'OTP sent successfully to +919999999999' },
              },
            },
          },
          400: { description: 'Invalid phone or email identifier' },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify OTP & Generate JWT Session',
        description: 'Verifies the OTP code and returns an access token and refresh token cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'otp', 'role'],
                properties: {
                  identifier: { type: 'string', example: '+919999999999' },
                  otp: { type: 'string', example: '123456' },
                  role: { type: 'string', enum: ['CUSTOMER', 'SHOPKEEPER', 'RIDER', 'ADMIN'], example: 'CUSTOMER' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                example: {
                  success: true,
                  data: {
                    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    user: { id: 'usr-123', role: 'CUSTOMER' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid or expired OTP code' },
        },
      },
    },
    '/auth/google-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Google OAuth One-Tap Login',
        description: 'Exchanges a Google OAuth ID Token for an Aether Mart JWT session.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' },
                  role: { type: 'string', example: 'CUSTOMER' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Google login successful' },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh Access Token',
        description: 'Uses httpOnly refresh token cookie to issue a fresh JWT access token.',
        security: [],
        responses: {
          200: { description: 'Access token refreshed successfully' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout & Revoke Refresh Token',
        description: 'Revokes active refresh token and clears session cookies.',
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Active User Profile',
        description: 'Returns profile details of the currently authenticated user.',
        responses: {
          200: { description: 'Profile details returned' },
        },
      },
    },

    // ── 2. CUSTOMERS ────────────────────────────────────────────────────────
    '/customer/profile': {
      get: {
        tags: ['Customers'],
        summary: 'Get Customer Profile',
        responses: { 200: { description: 'Profile data' } },
      },
      put: {
        tags: ['Customers'],
        summary: 'Update Customer Profile',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { fullName: { type: 'string', example: 'John Doe' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Profile updated' } },
      },
    },
    '/customer/addresses': {
      get: {
        tags: ['Customers'],
        summary: 'List Saved Addresses',
        responses: { 200: { description: 'Addresses list' } },
      },
      post: {
        tags: ['Customers'],
        summary: 'Add New Delivery Address',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  streetAddress: { type: 'string', example: '8th Main, Koramangala' },
                  latitude: { type: 'number', example: 12.9716 },
                  longitude: { type: 'number', example: 77.5946 },
                  postalCode: { type: 'string', example: '560034' },
                  city: { type: 'string', example: 'Bangalore' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Address created' } },
      },
    },

    // ── 3. CATEGORIES ───────────────────────────────────────────────────────
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List All Taxonomy Categories',
        security: [],
        responses: { 200: { description: 'Categories taxonomy tree' } },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get Category Details',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Category details' } },
      },
    },

    // ── 4. PRODUCTS & CATALOG ───────────────────────────────────────────────
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'Search & Filter Products',
        security: [],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'latitude', in: 'query', schema: { type: 'number' } },
          { name: 'longitude', in: 'query', schema: { type: 'number' } },
          { name: 'maxDistanceKm', in: 'query', schema: { type: 'number', default: 5 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Filtered products listing' } },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get Product Details',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product details with variants and reviews' } },
      },
    },
    '/products/search-suggestions': {
      get: {
        tags: ['Products'],
        summary: 'Search Autocomplete Suggestions',
        security: [],
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Matching query strings' } },
      },
    },

    // ── 5. STORE & MERCHANT PROFILES ────────────────────────────────────────
    '/merchant/profile': {
      put: {
        tags: ['Store', 'Merchant'],
        summary: 'Update Store Profile & Timings',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  storeName: { type: 'string', example: 'Kirana Store' },
                  address: { type: 'string', example: '123 Main Street' },
                  latitude: { type: 'number', example: 12.9716 },
                  longitude: { type: 'number', example: 77.5946 },
                  deliveryRadiusKm: { type: 'number', example: 5 },
                  isOpen: { type: 'boolean', example: true },
                  isPaused: { type: 'boolean', example: false },
                  openingTime: { type: 'string', example: '08:00' },
                  closingTime: { type: 'string', example: '22:00' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Store profile updated successfully' } },
      },
      patch: {
        tags: ['Store', 'Merchant'],
        summary: 'Quick Toggle Store Availability',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  isOpen: { type: 'boolean' },
                  isPaused: { type: 'boolean' },
                  isHoliday: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Status updated' } },
      },
    },
    '/customer/stores': {
      get: {
        tags: ['Store'],
        summary: 'List Nearby Open Stores',
        security: [],
        parameters: [
          { name: 'latitude', in: 'query', schema: { type: 'number' } },
          { name: 'longitude', in: 'query', schema: { type: 'number' } },
        ],
        responses: { 200: { description: 'List of stores delivering to coordinates' } },
      },
    },

    // ── 6. MERCHANT & DASHBOARD ANALYTICS ───────────────────────────────────
    '/merchant/dashboard': {
      get: {
        tags: ['Merchant', 'Dashboard'],
        summary: 'Merchant Dashboard Live KPIs',
        responses: {
          200: {
            description: 'Live revenue, active orders count, low stock alerts, and sales graph',
          },
        },
      },
    },
    '/merchant/payouts': {
      get: {
        tags: ['Merchant'],
        summary: 'Get Settlement Payouts Ledger',
        responses: { 200: { description: 'Payout history' } },
      },
    },

    // ── 7. INVENTORY ────────────────────────────────────────────────────────
    '/merchant/products': {
      get: {
        tags: ['Inventory', 'Merchant'],
        summary: 'List Merchant Catalog & Stock Levels',
        responses: { 200: { description: 'Store product catalog' } },
      },
      post: {
        tags: ['Products', 'Merchant'],
        summary: 'Create New Product',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'categoryId', 'variants'],
                properties: {
                  name: { type: 'string', example: 'Basmati Rice 5kg' },
                  categoryId: { type: 'string' },
                  sku: { type: 'string', example: 'AM-GROC-0001' },
                  variants: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: '5kg Pack' },
                        price: { type: 'number', example: 450 },
                        sku: { type: 'string', example: 'AM-GROC-0001' },
                        stock: { type: 'integer', example: 20 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Product created' } },
      },
    },
    '/merchant/products/{id}': {
      put: {
        tags: ['Products', 'Inventory'],
        summary: 'Update Product Details & Stock',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product updated' } },
      },
      delete: {
        tags: ['Products', 'Merchant'],
        summary: 'Soft Delete Product',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Product soft deleted' } },
      },
    },

    // ── 8. ORDERS & CHECKOUT ────────────────────────────────────────────────
    '/customer/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place New Order',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['storeId', 'items', 'deliveryAddressId'],
                properties: {
                  storeId: { type: 'string' },
                  deliveryAddressId: { type: 'string' },
                  paymentMethod: { type: 'string', example: 'COD' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Order created successfully' } },
      },
      get: {
        tags: ['Orders'],
        summary: 'Get Customer Order History',
        responses: { 200: { description: 'Order list' } },
      },
    },
    '/merchant/orders': {
      get: {
        tags: ['Orders', 'Merchant'],
        summary: 'Get Storefront Orders Feed',
        responses: { 200: { description: 'Live store orders' } },
      },
    },

    // ── 9. RIDERS ───────────────────────────────────────────────────────────
    '/rider/assignments': {
      get: {
        tags: ['Riders'],
        summary: 'Get Rider Delivery Assignments',
        responses: { 200: { description: 'Job list' } },
      },
    },
    '/rider/location': {
      post: {
        tags: ['Riders', 'Location'],
        summary: 'Stream Rider Live Coordinates',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  latitude: { type: 'number', example: 12.936 },
                  longitude: { type: 'number', example: 77.625 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Location stream updated' } },
      },
    },

    // ── 10. DASHBOARD & ADMIN ───────────────────────────────────────────────
    '/admin/kpis': {
      get: {
        tags: ['Dashboard'],
        summary: 'Admin Platform Metrics Overview',
        responses: { 200: { description: 'Platform analytics' } },
      },
    },
    '/admin/settings': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get Platform Configurations',
        responses: { 200: { description: 'Config list' } },
      },
      post: {
        tags: ['Dashboard'],
        summary: 'Bulk Update Platform Settings',
        responses: { 200: { description: 'Settings updated' } },
      },
    },

    // ── 11. NOTIFICATIONS ───────────────────────────────────────────────────
    '/customer/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get User Notifications',
        responses: { 200: { description: 'Notifications list' } },
      },
    },
    '/customer/notifications/preferences': {
      post: {
        tags: ['Notifications'],
        summary: 'Update Channel Preferences (Push, Email, WhatsApp)',
        responses: { 200: { description: 'Preferences saved' } },
      },
    },

    // ── 12. UPLOADS ─────────────────────────────────────────────────────────
    '/uploads/image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload Media Asset to CDN',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Asset URL returned' } },
      },
    },

    // ── 13. LOCATION ────────────────────────────────────────────────────────
    '/location/reverse-geocode': {
      post: {
        tags: ['Location'],
        summary: 'Reverse Geocode Coordinates',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  latitude: { type: 'number', example: 12.9716 },
                  longitude: { type: 'number', example: 77.5946 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Address data' } },
      },
    },

    // ── 14. POSTAL ──────────────────────────────────────────────────────────
    '/postal/pincode/{pincode}': {
      get: {
        tags: ['Postal'],
        summary: 'Lookup Indian PINCODE Details',
        security: [],
        parameters: [{ name: 'pincode', in: 'path', required: true, schema: { type: 'string', example: '560034' } }],
        responses: { 200: { description: 'Pincode city and state' } },
      },
    },
    '/postal/city/{city}': {
      get: {
        tags: ['Postal'],
        summary: 'Lookup City Details',
        security: [],
        parameters: [{ name: 'city', in: 'path', required: true, schema: { type: 'string', example: 'Bangalore' } }],
        responses: { 200: { description: 'City data' } },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/modules/**/*.routes.ts', './src/common/routes/*.ts', './dist/modules/**/*.routes.js', './dist/common/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
