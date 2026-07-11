import { z } from 'zod';

export const productsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  search: z.string().optional(),
  category: z.string().optional(), // category slug or id
  brand: z.string().optional(),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  rating: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  discount: z.string().optional().transform(val => val === 'true'),
  organic: z.string().optional().transform(val => val === 'true'),
  vegetarian: z.string().optional().transform(val => val === 'true'),
  inStock: z.string().optional().transform(val => val === 'true'),
  storeId: z.string().optional(),
  
  // Geolocation parameters for distance filtering
  latitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  longitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxDistanceKm: z.string().optional().transform(val => val ? parseFloat(val) : 5), // default 5km radius
  
  sort: z.enum([
    'relevance',
    'popularity',
    'newest',
    'price_asc',
    'price_desc',
    'discount',
    'rating'
  ]).optional().default('relevance'),
});

export const wishlistAddSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});

export const recordRecentViewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
});
