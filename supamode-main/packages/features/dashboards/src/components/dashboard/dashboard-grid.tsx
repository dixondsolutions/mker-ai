import { Responsive, WidthProvider } from 'react-grid-layout';

import { cn } from '@kit/ui/utils';

import { useGridLayout } from '../../hooks/use-grid-layout';
import { GRID_CONFIG } from '../../lib/grid-config';
import type { Dashboard, DashboardWidget, Layout } from '../../types';
import { WidgetContainer } from '../widgets/widget-container';
// dashboard CSS
import './index.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  dashboard: Dashboard;
  widgets: DashboardWidget[];
  isEditing?: boolean;
  layout?: Layout;
  onLayoutChange?: (layout: Layout) => void;
  onWidgetAdd?: () => void;
  className?: string;
}

export function DashboardGrid({
  dashboard,
  widgets,
  isEditing = false,
  layout,
  onLayoutChange,
  onWidgetAdd,
  className,
}: DashboardGridProps) {
  const {
    gridLayouts,
    layoutWidgets,
    isDragging,
    handleLayoutChange,
    handleDragStart,
    handleDragStop,
    handleDrop,
  } = useGridLayout({
    dashboard,
    widgets,
    isEditing,
    externalLayout: layout,
    onLayoutChange,
    onWidgetAdd,
  });

  return (
    <div
      className={cn('flex-1 overflow-y-auto pb-96', className)}
      data-testid="dashboard-grid"
    >
      <ResponsiveGridLayout
        {...GRID_CONFIG}
        layouts={gridLayouts}
        compactType={'horizontal'}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onDrop={handleDrop}
        isDraggable={isEditing}
        isResizable={isEditing}
        isDroppable={isEditing}
        className={cn('dashboard-grid-layout', {
          editing: isEditing,
          dragging: isDragging,
        })}
      >
        {layoutWidgets.map((widget) => {
          return (
            <div
              key={widget.id}
              className={cn('h-full w-full')}
              data-testid="widget-grid-item"
              data-widget-id={widget.id}
            >
              <WidgetContainer
                widget={widget}
                dashboardId={dashboard.id}
                isEditing={isEditing}
                className="h-full w-full"
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
