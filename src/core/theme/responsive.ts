/**
 * Aether Mart Responsive Breakpoints Design Tokens
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
  uw: 2560,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Helper to generate min-width media queries in javascript
 */
export const mediaQuery = {
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,
  uw: `(min-width: ${BREAKPOINTS.uw}px)`,
} as const;
