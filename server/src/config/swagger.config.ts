import swaggerJsdoc from 'swagger-jsdoc';

// ─── Swagger / OpenAPI Configuration ─────────────────────────────────────────

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Aether Mart API',
      version: '1.0.0',
      description: `
## Aether Mart Hyperlocal Commerce Platform API

Production-grade REST API for a multi-role hyperlocal delivery platform.

### Roles
- **Customer** — Browses catalog, places orders, tracks delivery
- **Shopkeeper (Merchant)** — Manages store, catalog, and fulfills orders  
- **Rider** — Accepts delivery jobs, updates live location
- **Admin** — Platform management, approvals, analytics

### Authentication
All protected endpoints require a \`Bearer\` token in the Authorization header.
Obtain tokens via the \`/auth/verify-otp\` endpoint.
      `.trim(),
      contact: {
        name: 'Aether Mart Engineering',
        email: 'api@aethermart.com',
      },
      license: {
        name: 'UNLICENSED',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development',
      },
      {
        url: 'https://api.aethermart.com',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Access Token. Obtain via /auth/verify-otp',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Operation successful' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Customer', description: 'Customer profile and addresses' },
      { name: 'Catalog', description: 'Products, categories, and stores' },
      { name: 'Cart', description: 'Shopping cart management' },
      { name: 'Wishlist', description: 'Wishlist management' },
      { name: 'Orders', description: 'Order placement and tracking' },
      { name: 'Payments', description: 'Payment processing via Razorpay' },
      { name: 'Merchant', description: 'Merchant store and catalog management' },
      { name: 'Rider', description: 'Rider delivery operations' },
      { name: 'Admin', description: 'Platform administration' },
      { name: 'Health', description: 'System health and monitoring' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/common/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
