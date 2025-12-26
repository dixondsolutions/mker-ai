import type { Layout as GridLayout } from 'react-grid-layout';

import type { Layout } from '../types';

/**
 * Grid configuration for the dashboard
 * This is used to generate the default layout for the dashboard
 * and to generate the responsive layouts for the dashboard
 */
export const GRID_CONFIG = {
  breakpoints: {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0,
  },
  cols: {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2,
  },
  rowHeight: 100,
  margin: [8, 8] as [number, number],
  containerPadding: [8, 0] as [number, number],
  useCSSTransforms: true,
  resizeHandles: ['se', 'sw', 'ne', 'nw'] as ('se' | 'sw' | 'ne' | 'nw')[],
} as const;

/**
 * Widget constraints for the dashboard
 * This is used to generate the default layout for the dashboard
 * and to generate the responsive layouts for the dashboard
 */
export const WIDGET_CONSTRAINTS = {
  minW: 2,
  minH: 1,
  maxH: 8,
  defaultW: 4,
  defaultH: 3,
} as const;

/**
 * Generate the default layout for the dashboard
 * @param widgetIds - The IDs of the widgets to generate the layout for
 * @param colsLg - The number of columns in the grid
 * @param widgetConstraints - The constraints for the widgets
 * @returns The default layout for the dashboard
 */
export function generateDefaultLayout(
  widgetIds: string[],
  colsLg: number = GRID_CONFIG.cols.lg,
  widgetConstraints?: Record<
    string,
    {
      minW: number;
      minH: number;
      maxW?: number;
      maxH: number;
      defaultW: number;
      defaultH: number;
    }
  >,
): GridLayout[] {
  return widgetIds.map((id, index) => {
    const constraints = widgetConstraints?.[id] ?? {
      minW: WIDGET_CONSTRAINTS.minW,
      minH: WIDGET_CONSTRAINTS.minH,
      maxH: WIDGET_CONSTRAINTS.maxH,
      defaultW: WIDGET_CONSTRAINTS.defaultW,
      defaultH: WIDGET_CONSTRAINTS.defaultH,
    };

    return {
      i: id,
      x: (index % (colsLg / constraints.defaultW)) * constraints.defaultW,
      y:
        Math.floor(index / (colsLg / constraints.defaultW)) *
        constraints.defaultH,
      w: constraints.defaultW,
      h: constraints.defaultH,
      minW: constraints.minW,
      minH: constraints.minH,
      maxW: constraints.maxW,
      maxH: constraints.maxH,
    };
  });
}

/**
 * Generate the responsive layouts for the dashboard
 * @param baseLayout - The base layout for the dashboard
 * @returns The responsive layouts for the dashboard
 */
export function generateResponsiveLayouts(baseLayout: GridLayout[]) {
  return {
    lg: baseLayout,
    md: baseLayout.map((item) => ({
      ...item,
      w: Math.min(item.w, GRID_CONFIG.cols.md),
    })),
    sm: baseLayout.map((item) => ({
      ...item,
      w: Math.min(item.w, GRID_CONFIG.cols.sm),
    })),
    xs: baseLayout.map((item) => ({
      ...item,
      w: Math.min(item.w, GRID_CONFIG.cols.xs),
    })),
    xxs: baseLayout.map((item) => ({
      ...item,
      w: Math.min(item.w, GRID_CONFIG.cols.xxs),
    })),
  };
}

/**
 * Convert the layout to a grid layout
 * @param layout - The layout to convert
 * @returns The grid layout
 */
export function layoutToGridLayout(layout: Layout): GridLayout[] {
  return layout.map((item) => ({
    ...item,
    minW: WIDGET_CONSTRAINTS.minW,
    minH: WIDGET_CONSTRAINTS.minH,
    maxH: WIDGET_CONSTRAINTS.maxH,
  }));
}

/**
 * Convert the grid layout to a layout
 * @param layout - The grid layout to convert
 * @returns The layout
 */
export function gridLayoutToLayout(layout: GridLayout[]): Layout {
  return layout.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static,
  }));
}
