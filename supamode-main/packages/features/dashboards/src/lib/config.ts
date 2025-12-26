/**
 * Dashboard configuration
 * Only the essentials - no future-proofing or complex abstractions
 */

export const CONFIG = {
  // Grid layout
  GRID_COLS: 12,
  GRID_ROW_HEIGHT: 60,

  // Auto-save timing
  SAVE_DELAY: 3000, // 3 seconds
  MAX_RETRIES: 2,

  // Widget defaults
  DEFAULT_WIDGET_SIZE: { w: 4, h: 3 },
  MIN_WIDGET_SIZE: { w: 1, h: 1 },

  // Query limits for safety
  MAX_COLUMNS: 50,
  MAX_FILTERS: 20,
  MAX_ROWS: 1000,

  // Simple widget sizes by type
  WIDGET_SIZES: {
    chart: { w: 4, h: 3 },
    metric: { w: 2, h: 2 },
    table: { w: 6, h: 4 },
  },
} as const;
