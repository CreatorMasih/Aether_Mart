import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { buttonPress } from '../../../core/theme/animations';

const categoryEmojis: Record<string, string> = {
  'daily-essentials': '🥛',
  'fresh-fruits-and-vegetables': '🍎',
  'pharmacy': '💊',
  'personal-care': '🧴',
  'pet-care': '🐾',
  'electronics': '📱',
};

interface CategoryCircleGridProps {
  /** Max number of categories to render (defaults to all). */
  limit?: number;
  /**
   * Exact column count for a fixed grid (e.g. 6 for the home preview row).
   * When omitted the component uses its default responsive grid.
   */
  cols?: number;
  /** 'grid' (default) renders a responsive grid; 'row' renders a single horizontally-scrollable row. */
  layout?: 'grid' | 'row';
}

export const CategoryCircleGrid: React.FC<CategoryCircleGridProps> = ({
  limit,
  cols,
  layout = 'grid',
}) => {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => catalogService.getCategories(),
  });

  // cols prop overrides the layout-based class so cards always fill the row
  const containerClass = cols
    ? `grid gap-3`
    : layout === 'row'
      ? 'flex gap-4 overflow-x-auto pb-3 snap-x'
      : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3';

  const containerStyle = cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : undefined;

  if (isLoading) {
    return (
      <div className={containerClass} style={containerStyle}>
        {[1, 2, 3, 4, 5, 6].slice(0, limit ?? 6).map((idx) => (
          <div
            key={idx}
            className={`h-24 rounded-2xl border border-border-primary bg-bg-secondary animate-pulse ${layout === 'row' && !cols ? 'w-20 shrink-0' : ''}`}
          />
        ))}
      </div>
    );
  }

  const visibleCategories = limit ? (categories || []).slice(0, limit) : categories || [];

  return (
    <div className={containerClass} style={containerStyle}>
      {visibleCategories.map((cat) => {
        const iconOrUrl = categoryEmojis[cat.slug] || cat.imageUrl || '📦';
        const isUrl =
          typeof iconOrUrl === 'string' &&
          (iconOrUrl.startsWith('http://') ||
            iconOrUrl.startsWith('https://') ||
            iconOrUrl.startsWith('data:image/'));

        return (
          <motion.button
            key={cat.id}
            variants={buttonPress}
            whileTap="whileTap"
            whileHover="whileHover"
            onClick={() => navigate(`/c/category/${cat.slug}`)}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border border-border-primary bg-bg-secondary hover:border-text-secondary cursor-pointer transition-all select-none ${layout === 'row' && !cols ? 'w-20 shrink-0 snap-start' : 'w-full'}`}
          >
            <div className="h-12 w-12 rounded-full bg-bg-tertiary flex items-center justify-center text-2xl shadow-subtle overflow-hidden">
              {isUrl ? (
                <img
                  src={iconOrUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{iconOrUrl && iconOrUrl.length <= 4 ? iconOrUrl : '📦'}</span>
              )}
            </div>
            <span className="text-[10px] font-bold text-text-primary text-center truncate max-w-full">
              {cat.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryCircleGrid;
