import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { CategoryCircleGrid } from './CategoryCircleGrid';
import { pageTransition } from '../../../core/theme/animations';
import { SEOHead } from '../../../components/seo/SEOHead';

/**
 * Full grid of all shopping categories. Reached from the "View All" link on
 * the home screen's "Shop by Category" section. CategoryCircleGrid handles its
 * own loading skeleton, so this page just provides the shell + error state.
 */
export const AllCategoriesPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: categories, isError, refetch } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => catalogService.getCategories(),
  });

  const count = categories?.length ?? 0;

  return (
    <>
      <SEOHead
        title="All Categories | Aether Mart"
        description="Browse every shopping category available on Aether Mart in Mahasamund."
        canonicalUrl="https://aether-mart-six.vercel.app/c/categories"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/c/home')}
              className="p-2 rounded-xl border border-border-primary bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary cursor-pointer transition-all"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
                <Grid className="h-5 w-5 text-brand-emerald" />
                Shop by Category
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 font-semibold">
                {count} {count === 1 ? 'category' : 'categories'} to explore
              </p>
            </div>
          </div>
        </div>

        {isError ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-sm font-bold text-text-primary font-heading">Failed to Load Categories</h2>
            <p className="text-xs text-text-secondary max-w-xs">An error occurred while fetching categories.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : (
          <CategoryCircleGrid />
        )}
      </motion.div>
    </>
  );
};

export default AllCategoriesPage;
