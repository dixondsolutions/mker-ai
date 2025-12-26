import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { WIDGET_CONSTRAINTS } from '../lib/grid-config';
import type { Dashboard, DashboardWidget, Layout, LayoutItem } from '../types';

interface UseDashboardLayoutProps {
  dashboard: Dashboard | null | undefined;
  widgets?: DashboardWidget[];
  enabled?: boolean;
}

interface UseDashboardLayoutReturn {
  layout: Layout;
  updateLayout: (newLayout: Layout) => void;
  saveLayout: () => void;
  resetLayout: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

/**
 * Simplified dashboard layout hook
 */
export function useDashboardLayout({
  dashboard,
  widgets = [],
}: UseDashboardLayoutProps): UseDashboardLayoutReturn {
  const fetcher = useFetcher();
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);

  // Create layout from widgets
  const baseLayout = useMemo((): Layout => {
    if (!dashboard || !widgets.length) return [];

    return widgets.map((widget) => {
      const position =
        typeof widget.position === 'string'
          ? JSON.parse(widget.position)
          : widget.position;

      return {
        i: widget.id,
        x: position?.x ?? 0,
        y: position?.y ?? 0,
        w: position?.w ?? WIDGET_CONSTRAINTS.defaultW,
        h: position?.h ?? WIDGET_CONSTRAINTS.defaultH,
      };
    });
  }, [widgets, dashboard]);

  // Use editing layout if available, otherwise base layout
  const layout = editingLayout || baseLayout;
  const isDirty = editingLayout !== null;

  const updateLayout = useCallback((newLayout: Layout) => {
    setEditingLayout(newLayout);
  }, []);

  const saveLayout = useCallback(() => {
    if (!isDirty || !editingLayout || !dashboard) return;

    const updates = editingLayout.map((item) => ({
      id: item.i,
      position: { x: item.x, y: item.y, w: item.w, h: item.h },
    }));

    fetcher.submit(JSON.stringify({ updates }), {
      method: 'PUT',
      action: `/dashboards/${dashboard.id}/widgets/positions`,
      encType: 'application/json',
    });

    // Don't clear editing layout here - wait for server response
  }, [isDirty, editingLayout, fetcher, dashboard]);

  // Clear editing layout when widgets are added/deleted (so changes become visible)
  if (editingLayout && baseLayout.length >= 0) {
    const editingWidgetIds = new Set(editingLayout.map((item) => item.i));
    const baseWidgetIds = new Set(baseLayout.map((item) => item.i));

    // Check if widgets were added or deleted
    const hasNewWidgets = baseLayout.some(
      (item) => !editingWidgetIds.has(item.i),
    );

    const hasDeletedWidgets = editingLayout.some(
      (item) => !baseWidgetIds.has(item.i),
    );

    if (hasNewWidgets || hasDeletedWidgets) {
      setEditingLayout(null);
    }
  }

  const resetLayout = useCallback(() => {
    setEditingLayout(null);
  }, []);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === 'idle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditingLayout(null);
    }
  }, [fetcher.data, fetcher.state]);

  return useMemo(
    () => ({
      layout,
      updateLayout,
      saveLayout,
      resetLayout,
      isDirty,
      isSaving: fetcher.state === 'submitting',
    }),
    [layout, updateLayout, saveLayout, resetLayout, isDirty, fetcher.state],
  );
}

/**
 * Utility functions for layout management
 */
export const layoutUtils = {
  /**
   * Find next available position for a new widget
   */
  findNextPosition: (
    layout: Layout,
    widgetSize: { w: number; h: number },
    cols = 12,
  ): LayoutItem => {
    if (layout.length === 0) {
      return { i: '', x: 0, y: 0, w: widgetSize.w, h: widgetSize.h };
    }

    // Try to find space in existing rows first
    for (
      let y = 0;
      y <= Math.max(...layout.map((item) => item.y + item.h));
      y++
    ) {
      for (let x = 0; x <= cols - widgetSize.w; x++) {
        const position = { x, y, w: widgetSize.w, h: widgetSize.h };
        if (!layoutUtils.hasCollision(layout, position)) {
          return { i: '', ...position };
        }
      }
    }

    // If no space found, add to bottom
    const maxY = Math.max(...layout.map((item) => item.y + item.h), 0);
    return { i: '', x: 0, y: maxY, w: widgetSize.w, h: widgetSize.h };
  },

  /**
   * Check if a position collides with existing layout items
   */
  hasCollision: (
    layout: Layout,
    position: { x: number; y: number; w: number; h: number },
  ): boolean => {
    return layout.some((item) => {
      return !(
        position.x >= item.x + item.w ||
        item.x >= position.x + position.w ||
        position.y >= item.y + item.h ||
        item.y >= position.y + position.h
      );
    });
  },

  /**
   * Compact layout by removing gaps
   */
  compactLayout: (layout: Layout): Layout => {
    const sortedLayout = [...layout].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    const compacted: LayoutItem[] = [];

    for (const item of sortedLayout) {
      let newY = 0;

      // Find the lowest possible Y position
      while (layoutUtils.hasCollision(compacted, { ...item, y: newY })) {
        newY++;
      }

      compacted.push({ ...item, y: newY });
    }

    return compacted;
  },

  /**
   * Validate layout for conflicts and constraints
   */
  validateLayout: (
    layout: Layout,
    constraints?: { maxCols?: number; maxRows?: number },
  ): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    const maxCols = constraints?.maxCols || 12;
    const maxRows = constraints?.maxRows || 100;

    // Check for overlapping items
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const itemA = layout[i];
        const itemB = layout[j];
        if (!itemA || !itemB) continue;
        if (!layoutUtils.hasCollision([itemA], itemB)) continue;
        errors.push(`Items ${itemA.i} and ${itemB.i} overlap`);
      }
    }

    // Check bounds
    for (const item of layout) {
      if (item.x < 0 || item.y < 0) {
        errors.push(`Item ${item.i} has negative position`);
      }
      if (item.x + item.w > maxCols) {
        errors.push(`Item ${item.i} exceeds maximum columns`);
      }
      if (item.y + item.h > maxRows) {
        errors.push(`Item ${item.i} exceeds maximum rows`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};
