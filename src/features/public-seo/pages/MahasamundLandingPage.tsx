import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShoppingBag, ArrowRight, Utensils, Milk, Pill, Package } from 'lucide-react';
import { SEOHead } from '../../../components/seo/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../customer-catalog/services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { StoreCardGrid } from '../../customer-catalog/components/StoreCardGrid';
import { ProductCardGrid } from '../../customer-catalog/components/ProductCardGrid';

export const MahasamundLandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Fetch real stores & products in Mahasamund (21.1085, 82.0965)
  const { data: homeFeed } = useQuery({
    queryKey: queryKeys.homeFeed(21.1085, 82.0965),
    queryFn: () => catalogService.getHomeFeed(21.1085, 82.0965),
  });

  const stores = homeFeed?.nearbyStores || [];
  const products = homeFeed?.recommendedProducts || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Aether Mart Mahasamund',
    url: 'https://aether-mart-six.vercel.app/mahasamund-delivery',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    description: 'Hyperlocal delivery of food, groceries, medicines, and daily essentials in Mahasamund, Chhattisgarh.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Main Road',
      addressLocality: 'Mahasamund',
      addressRegion: 'Chhattisgarh',
      postalCode: '493445',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 21.1085,
      longitude: 82.0965,
    },
  };

  return (
    <>
      <SEOHead
        title="Hyperlocal Delivery in Mahasamund | Food, Groceries & Medicines | Aether Mart"
        description="Order food, groceries, medicines, and daily essentials from trusted local stores in Mahasamund, Chhattisgarh with fast 10-30 mins delivery."
        canonicalUrl="https://aether-mart-six.vercel.app/mahasamund-delivery"
        jsonLd={jsonLd}
      />

      <div className="min-h-screen bg-slate-50 text-slate-900 select-none pb-16">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span onClick={() => navigate('/c/home')} className="font-heading font-extrabold text-xl text-emerald-600 cursor-pointer">
                Aether Mart
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                Mahasamund Service Area
              </span>
            </div>
            <button
              onClick={() => navigate('/c/home')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 pt-8 space-y-12">
          {/* Main Hero Section */}
          <section className="relative rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 sm:p-10 text-white overflow-hidden shadow-xl border border-emerald-700/40">
            <div className="relative z-10 space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold">
                <MapPin className="h-3.5 w-3.5 text-amber-300" />
                <span>Serving Mahasamund, Chhattisgarh (PIN: 493445)</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading leading-tight tracking-tight text-white">
                Everything you need, delivered locally in Mahasamund
              </h1>

              <p className="text-sm sm:text-base text-emerald-100/90 font-medium leading-relaxed">
                Order food, groceries, medicines, daily essentials, and personal care from trusted local stores in Mahasamund with fast 10-30 mins doorstep delivery.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/c/home')}
                  className="px-6 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4 text-emerald-600" />
                  <span>Shop Now</span>
                </button>
                <button
                  onClick={() => navigate('/categories')}
                  className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Explore Categories
                </button>
              </div>
            </div>
          </section>

          {/* Core Service Categories */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 font-heading">
              Delivery Categories Supported in Mahasamund
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { title: 'Food & Meals', desc: 'Local restaurants & hot meals', icon: Utensils, route: '/food-delivery-mahasamund' },
                { title: 'Groceries & Staples', desc: 'Rice, wheat, oils & spices', icon: Package, route: '/grocery-delivery-mahasamund' },
                { title: 'Medicines & Pharmacy', desc: 'OTC healthcare & wellness', icon: Pill, route: '/medicine-delivery-mahasamund' },
                { title: 'Daily Essentials', desc: 'Milk, bread, butter & eggs', icon: Milk, route: '/daily-essentials-mahasamund' },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => navigate(item.route)}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer group space-y-3"
                  >
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors font-heading">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Real Local Stores in Mahasamund */}
          {stores.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 font-heading">
                    Trusted Local Merchants in Mahasamund
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Real PostgreSQL-verified store partners
                  </p>
                </div>
              </div>
              <StoreCardGrid stores={stores} />
            </section>
          )}

          {/* Real Local Products in Mahasamund */}
          {products.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 font-heading">
                    Popular Products in Mahasamund
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Fresh produce & daily essentials available right now
                  </p>
                </div>
              </div>
              <ProductCardGrid products={products} />
            </section>
          )}

          {/* Local Information & SEO Content */}
          <section className="p-8 rounded-3xl border border-slate-200 bg-white space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 font-heading">
              About Aether Mart Mahasamund
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aether Mart serves residents and businesses across Mahasamund, Chhattisgarh. Whether you need fresh organic vegetables, milk, bakery products, medicines, or daily household supplies, Aether Mart connects you directly with verified local merchants for fast, dependable delivery.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};

export default MahasamundLandingPage;
