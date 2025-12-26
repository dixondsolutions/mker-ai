import { useCallback, useMemo, useState } from 'react';

import type { Layout as GridLayout } from 'react-grid-layout';

import {
  WIDGET_CONSTRAINTS,
  generateDefaultLayout,
  generateResponsiveLayouts,
  gridLayoutToLayout,
} from '../lib/grid-config';
import { getWidgetTypeConfig } from '../lib/widget-registry';
import type { Dashboard, DashboardWidget, Layout } from '../types';

interface UseGridLayoutProps {
  dashboard: Dashboard;
  widgets: DashboardWidget[];
  isEditing: boolean;
  externalLayout?: Layout; // Layout from parent (e.g., useDashboardLayout)
  onLayoutChange?: (layout: Layout) => void;
  onWidgetAdd?: (
    widgetType: string,
    position: { x: number; y: number },
  ) => void;
}

function getWidgetConstraints(widget: DashboardWidget) {
  const typeConfig = getWidgetTypeConfig(
    widget.widget_type as 'chart' | 'metric' | 'table',
  );
  return {
    minW: typeConfig?.minSize.w ?? WIDGET_CONSTRAINTS.minW,
    minH: typeConfig?.minSize.h ?? WIDGET_CONSTRAINTS.minH,
    maxW: typeConfig?.maxSize?.w,
    maxH: typeConfig?.maxSize?.h ?? WIDGET_CONSTRAINTS.maxH,
    defaultW: typeConfig?.defaultSize.w ?? WIDGET_CONSTRAINTS.defaultW,
    defaultH: typeConfig?.defaultSize.h ?? WIDGET_CONSTRAINTS.defaultH,
  };
}

export function useGridLayout({
  widgets,
  isEditing,
  externalLayout,
  onLayoutChange,
  onWidgetAdd,
}: UseGridLayoutProps) {
  const [isDragging, setIsDragging] = useState(false);

  const gridLayouts = useMemo(
    () => getGridLayouts(widgets, externalLayout),
    [widgets, externalLayout],
  );

  // Filter widgets that exist in the layout
  const layoutWidgets = useMemo(
    () =>
      widgets.filter((widget) =>
        gridLayouts.lg?.some((layout) => layout.i === widget.id),
      ),
    [widgets, gridLayouts.lg],
  );

  // Handle layout changes
  const handleLayoutChange = useCallback(
    (layout: GridLayout[], _layouts: { [key: string]: GridLayout[] }) => {
      if (!isEditing) return;

      const newLayout = gridLayoutToLayout(layout);

      onLayoutChange?.(newLayout);
    },
    [isEditing, onLayoutChange],
  );

  // Handle drag state
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle drop from widget palette
  const handleDrop = useCallback(
    (_: GridLayout[], layoutItem: GridLayout, event: Event) => {
      if (!isEditing) return;

      const dragEvent = event as DragEvent;
      const widgetType = dragEvent.dataTransfer?.getData('widgetType');

      if (widgetType && onWidgetAdd) {
        onWidgetAdd(widgetType, {
          x: layoutItem.x,
          y: layoutItem.y,
        });
      }
    },
    [isEditing, onWidgetAdd],
  );

  return {
    gridLayouts,
    layoutWidgets,
    isDragging,
    handleLayoutChange,
    handleDragStart,
    handleDragStop,
    handleDrop,
  };
}

function getGridLayouts(
  widgets: DashboardWidget[],
  externalLayout: Layout | undefined,
) {
  if (externalLayout && externalLayout.length > 0) {
    const layoutWithConstraints = externalLayout.map((item) => {
      const widget = widgets.find((w) => w.id === item.i);

      if (widget) {
        const constraints = getWidgetConstraints(widget);

        return {
          ...item,
          minW: constraints.minW,
          minH: constraints.minH,
          maxW: constraints.maxW,
          maxH: constraints.maxH,
        };
      }

      return {
        ...item,
        minW: WIDGET_CONSTRAINTS.minW,
        minH: WIDGET_CONSTRAINTS.minH,
        maxH: WIDGET_CONSTRAINTS.maxH,
      };
    });

    return generateResponsiveLayouts(layoutWithConstraints);
  }

  // Create layout from individual widget positions
  const layoutFromWidgets = widgets.map((widget) => {
    const position =
      typeof widget.position === 'string'
        ? JSON.parse(widget.position)
        : widget.position;

    const constraints = getWidgetConstraints(widget);

    return {
      i: widget.id,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      w: position?.w ?? constraints.defaultW,
      h: position?.h ?? constraints.defaultH,
      minW: constraints.minW,
      minH: constraints.minH,
      maxW: constraints.maxW,
      maxH: constraints.maxH,
    };
  });

  // Generate default layout if widget positions are missing
  if (layoutFromWidgets.length === 0) {
    const widgetIds = widgets.map((w) => w.id);

    const widgetConstraints = widgets.reduce(
      (acc, widget) => {
        acc[widget.id] = getWidgetConstraints(widget);
        return acc;
      },
      {} as Record<string, ReturnType<typeof getWidgetConstraints>>,
    );

    const defaultLayout = generateDefaultLayout(
      widgetIds,
      undefined,
      widgetConstraints,
    );

    return generateResponsiveLayouts(defaultLayout);
  }

  // Use widget positions
  const layout = layoutFromWidgets;

  return generateResponsiveLayouts(layout);
}
