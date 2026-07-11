import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MOCK_CATEGORIES } from '../services/mock-catalog-data';
import { buttonPress } from '../../../core/theme/animations';

export const CategoryCircleGrid: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
      {MOCK_CATEGORIES.map((cat) => (
        <motion.button
          key={cat.id}
          variants={buttonPress}
          whileTap="whileTap"
          whileHover="whileHover"
          onClick={() => navigate(`/c/category/${cat.slug}`)}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border-primary bg-bg-secondary hover:border-text-secondary cursor-pointer transition-all select-none"
        >
          <div className="h-12 w-12 rounded-full bg-bg-tertiary flex items-center justify-center text-2xl shadow-subtle">
            {cat.imageUrl}
          </div>
          <span className="text-[10px] font-bold text-text-primary text-center truncate max-w-full">
            {cat.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default CategoryCircleGrid;
