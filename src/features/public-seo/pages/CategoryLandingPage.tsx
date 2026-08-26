import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { SEOHead } from '../../../components/seo/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../customer-catalog/services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { ProductCardGrid } from '../../customer-catalog/components/ProductCardGrid';

const CATEGORY_MAP: Record<string, { name: string; title: string; desc: string; slug: string }> = {
  'food-delivery-mahasamund': {
    name: 'Food & Meals',
    title: 'Food Delivery in Mahasamund | Local Meals & Snacks | Aether Mart',
    desc: 'Order delicious food and snacks from top restaurants and local eateries in Mahasamund, Chhattisgarh.',
    slug: 'daily-essentials',
  },
  'grocery-delivery-mahasamund': {
    name: 'Groceries & Daily Essentials',
    title: 'Online Grocery Delivery in Mahasamund | Fresh Produce & Staples | Aether Mart',
    desc: 'Buy fresh groceries, rice, wheat, oils, and daily essentials online in Mahasamund with fast delivery.',
    slug: 'grocery-and-staples',
  },
  'medicine-delivery-mahasamund': {
    name: 'Medicines & Pharmacy',
    title: 'Medicine Delivery in Mahasamund | OTC Healthcare | Aether Mart',
    desc: 'Order OTC medicines, healthcare essentials, and wellness products online in Mahasamund, Chhattisgarh.',
    slug: 'pharmacy',
  },
  'daily-essentials-mahasamund': {
    name: 'Daily Essentials & Dairy',
    title: 'Daily Essentials & Milk Delivery in Mahasamund | Aether Mart',
    desc: 'Fresh milk, eggs, bread, butter, and daily essential supplies delivered to your home in Mahasamund.',
    slug: 'daily-essentials',
  },
  'personal-care-mahasamund': {
    name: 'Personal Care & Hygiene',
    title: 'Personal Care Products Delivery in Mahasamund | Aether Mart',
    desc: 'Skincare, haircare, hygiene, and personal care products delivered locally in Mahasamund.',
    slug: 'personal-care',
  },
};

export const CategoryLandingPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const config = CATEGORY_MAP[categorySlug || ''] || {
    name: 'Catalog Products',
    title: 'Hyperlocal Category Delivery in Mahasamund | Aether Mart',
    desc: 'Explore products available for local delivery in Mahasamund, Chhattisgarh.',
    slug: categorySlug || 'daily-essentials',
  };

  const { data: productData, isLoading } = useQuery({
    queryKey: queryKeys.products({ category: config.slug, limit: 12 }),
    queryFn: () => catalogService.getProducts({ category: config.slug, limit: 12 }),
  });

  const products = productData?.products || [];

  return (
    <>
      <SEOHead
        title={config.title}
        description={config.desc}
        canonicalUrl={`https://aether-mart-six.vercel.app/${categorySlug || ''}`}
      />

      <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-16">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate('/mahasamund-delivery')}
              className="flex items-center gap-2 text-xs font-extrabold text-slate-700 hover:text-emerald-600 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Mahasamund Overview</span>
            </button>
            <span onClick={() => navigate('/c/home')} className="font-heading font-extrabold text-xl text-emerald-600 cursor-pointer">
              Aether Mart
            </span>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
          {/* Hero Section */}
          <div className="p-8 rounded-3xl bg-emerald-900 text-white space-y-3 shadow-md border border-emerald-800">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Mahasamund Category Delivery
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              {config.name} in Mahasamund
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
              {config.desc}
            </p>
          </div>

          {/* Products Grid */}
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 font-heading">
              Available {config.name} Items
            </h2>

            {isLoading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-500">
                Loading matching products...
              </div>
            ) : products.length > 0 ? (
              <ProductCardGrid products={products} />
            ) : (
              <div className="p-8 rounded-2xl border border-slate-200 bg-white text-center space-y-2">
                <Package className="h-8 w-8 text-slate-400 mx-auto" />
                <h3 className="text-xs font-bold text-slate-800">No items available in this category yet.</h3>
                <p className="text-[11px] text-slate-500">More merchants are adding items in Mahasamund soon.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

export default CategoryLandingPage;
