import type { Variants } from 'framer-motion';

/**
 * Reusable Framer Motion Variants for Aether Mart
 */

// 1. Page transitions
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1], // ease-in-out standard
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// 2. Snappy buttons spring
export const buttonPress = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.01 },
  transition: { type: 'spring', stiffness: 400, damping: 15 },
};

// 3. Staggered list animations
export const listContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// 4. Premium card lift
export const cardHover: Variants = {
  initial: { y: 0, boxShadow: 'var(--shadow-low)' },
  hover: {
    y: -4,
    boxShadow: 'var(--shadow-mid)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

// 5. Centered Modals entry
export const modalAnimation: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 26,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 8,
    transition: {
      duration: 0.15,
      ease: 'easeInOut',
    },
  },
};

// 6. Slide drawers (bottom sheet mobile, right drawer desktop)
export const drawerSlide = (dir: 'right' | 'bottom'): Variants => {
  const isRight = dir === 'right';
  return {
    initial: {
      x: isRight ? '100%' : 0,
      y: isRight ? 0 : '100%',
    },
    animate: {
      x: 0,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 26,
      },
    },
    exit: {
      x: isRight ? '100%' : 0,
      y: isRight ? 0 : '100%',
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
  };
};

// 7. Floating Action Buttons (FAB)
export const fabPop: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 20,
      delay: 0.2,
    },
  },
  hover: {
    scale: 1.05,
    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
  },
  tap: { scale: 0.95 },
};

// 8. Hero element entrances
export const heroReveal: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
    },
  },
};
