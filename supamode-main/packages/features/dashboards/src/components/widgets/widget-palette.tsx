import { DragEvent, useCallback, useState } from 'react';

import {
  ActivityIcon,
  AreaChartIcon,
  BarChart3Icon,
  CalendarIcon,
  DatabaseIcon,
  DollarSignIcon,
  GripVerticalIcon,
  LineChartIcon,
  PieChartIcon,
  TableIcon,
  TargetIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import type { WidgetObject } from '../../types';
import { TemplatePalette } from './template-palette';

interface WidgetPaletteProps {
  onWidgetSelect?: (widgetType: string) => void;
  isDraggable?: boolean;
  className?: string;
}

const WIDGET_CATEGORIES = [
  {
    id: 'charts',
    name: <Trans i18nKey="dashboard:widgetPalette.categories.charts.name" />,
    description: (
      <Trans i18nKey="dashboard:widgetPalette.categories.charts.description" />
    ),
    widgets: [
      {
        id: 'chart-bar',
        name: <Trans i18nKey="dashboard:widgetPalette.widgets.barChart.name" />,
        icon: BarChart3Icon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.barChart.description" />
        ),
        defaultSize: { w: 4, h: 3 },
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
      },
      {
        id: 'chart-line',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.lineChart.name" />
        ),
        icon: LineChartIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.lineChart.description" />
        ),
        defaultSize: { w: 6, h: 3 },
        color: 'text-green-500',
        bgColor: 'bg-green-50',
      },
      {
        id: 'chart-pie',
        name: <Trans i18nKey="dashboard:widgetPalette.widgets.pieChart.name" />,
        icon: PieChartIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.pieChart.description" />
        ),
        defaultSize: { w: 3, h: 3 },
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
      },
      {
        id: 'chart-area',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.areaChart.name" />
        ),
        icon: AreaChartIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.areaChart.description" />
        ),
        defaultSize: { w: 6, h: 3 },
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
      },
    ],
  },
  {
    id: 'metrics',
    name: <Trans i18nKey="dashboard:widgetPalette.categories.metrics.name" />,
    description: (
      <Trans i18nKey="dashboard:widgetPalette.categories.metrics.description" />
    ),
    widgets: [
      {
        id: 'metric-number',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.numberMetric.name" />
        ),
        icon: TrendingUpIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.numberMetric.description" />
        ),
        defaultSize: { w: 2, h: 2 },
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
      },
      {
        id: 'metric-gauge',
        name: <Trans i18nKey="dashboard:widgetPalette.widgets.gauge.name" />,
        icon: TargetIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.gauge.description" />
        ),
        defaultSize: { w: 3, h: 3 },
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-50',
      },
      {
        id: 'metric-trend',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.trendMetric.name" />
        ),
        icon: ActivityIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.trendMetric.description" />
        ),
        defaultSize: { w: 3, h: 2 },
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50',
      },
    ],
  },
  {
    id: 'tables',
    name: <Trans i18nKey="dashboard:widgetPalette.categories.tables.name" />,
    description: (
      <Trans i18nKey="dashboard:widgetPalette.categories.tables.description" />
    ),
    widgets: [
      {
        id: 'table-data',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.dataTable.name" />
        ),
        icon: TableIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.dataTable.description" />
        ),
        defaultSize: { w: 6, h: 4 },
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
      },
      {
        id: 'table-list',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.simpleList.name" />
        ),
        icon: DatabaseIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.simpleList.description" />
        ),
        defaultSize: { w: 4, h: 4 },
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
      },
    ],
  },
  {
    id: 'specialized',
    name: (
      <Trans i18nKey="dashboard:widgetPalette.categories.specialized.name" />
    ),
    description: (
      <Trans i18nKey="dashboard:widgetPalette.categories.specialized.description" />
    ),
    widgets: [
      {
        id: 'calendar-events',
        name: <Trans i18nKey="dashboard:widgetPalette.widgets.calendar.name" />,
        icon: CalendarIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.calendar.description" />
        ),
        defaultSize: { w: 4, h: 4 },
        color: 'text-red-500',
        bgColor: 'bg-red-50',
      },
      {
        id: 'user-stats',
        name: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.userStats.name" />
        ),
        icon: UsersIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.userStats.description" />
        ),
        defaultSize: { w: 4, h: 3 },
        color: 'text-pink-500',
        bgColor: 'bg-pink-50',
      },
      {
        id: 'revenue-chart',
        name: <Trans i18nKey="dashboard:widgetPalette.widgets.revenue.name" />,
        icon: DollarSignIcon,
        description: (
          <Trans i18nKey="dashboard:widgetPalette.widgets.revenue.description" />
        ),
        defaultSize: { w: 4, h: 3 },
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      },
    ],
  },
];

export function WidgetPalette({
  onWidgetSelect,
  isDraggable = true,
  className,
}: WidgetPaletteProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, widgetId: string) => {
      if (!isDraggable) return;
      e.dataTransfer.setData('widgetType', widgetId);
      e.dataTransfer.effectAllowed = 'copy';
      setDraggedWidget(widgetId);
    },
    [isDraggable],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
  }, []);

  const handleWidgetClick = useCallback(
    (widgetId: string) => {
      onWidgetSelect?.(widgetId);
    },
    [onWidgetSelect],
  );

  return (
    <div className={cn('widget-palette', className)}>
      <Tabs defaultValue="custom" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="custom">
            <Trans
              i18nKey="dashboard:widgetPalette.tabs.custom"
              defaults="Custom Widgets"
            />
          </TabsTrigger>

          <TabsTrigger value="templates">
            <Trans
              i18nKey="dashboard:widgetPalette.tabs.templates"
              defaults="Templates"
            />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="mt-0">
          <div className="space-y-6">
            {WIDGET_CATEGORIES.map((category) => (
              <WidgetCategory
                key={category.id}
                category={category}
                draggedWidget={draggedWidget}
                isDraggable={isDraggable}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onWidgetClick={handleWidgetClick}
              />
            ))}
          </div>

          {/* Drag instructions */}
          {isDraggable && <DraggableHandle />}
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplatePalette />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface WidgetCategoryProps {
  category: (typeof WIDGET_CATEGORIES)[0];
  draggedWidget: string | null;
  isDraggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, widgetId: string) => void;
  onDragEnd: () => void;
  onWidgetClick: (widgetId: string) => void;
}

function WidgetCategory({
  category,
  draggedWidget,
  isDraggable,
  onDragStart,
  onDragEnd,
  onWidgetClick,
}: WidgetCategoryProps) {
  return (
    <div className="widget-category">
      <CategoryHeader category={category} />
      <WidgetGrid
        widgets={category.widgets}
        draggedWidget={draggedWidget}
        isDraggable={isDraggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onWidgetClick={onWidgetClick}
      />
    </div>
  );
}

interface CategoryHeaderProps {
  category: (typeof WIDGET_CATEGORIES)[0];
}

function CategoryHeader({ category }: CategoryHeaderProps) {
  return (
    <div className="mb-3">
      <h3 className="text-lg font-semibold">{category.name}</h3>
      <p className="text-muted-foreground text-sm">{category.description}</p>
    </div>
  );
}

interface WidgetGridProps {
  widgets: (typeof WIDGET_CATEGORIES)[0]['widgets'];
  draggedWidget: string | null;
  isDraggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, widgetId: string) => void;
  onDragEnd: () => void;
  onWidgetClick: (widgetId: string) => void;
}

function WidgetGrid({
  widgets,
  draggedWidget,
  isDraggable,
  onDragStart,
  onDragEnd,
  onWidgetClick,
}: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          isDragging={draggedWidget === widget.id}
          isDraggable={isDraggable}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onWidgetClick={onWidgetClick}
        />
      ))}
    </div>
  );
}

interface WidgetCardProps {
  widget: (typeof WIDGET_CATEGORIES)[0]['widgets'][0];
  isDragging: boolean;
  isDraggable: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, widgetId: string) => void;
  onDragEnd: () => void;
  onWidgetClick: (widgetId: string) => void;
}

function WidgetCard({
  widget,
  isDragging,
  isDraggable,
  onDragStart,
  onDragEnd,
  onWidgetClick,
}: WidgetCardProps) {
  const IconComponent = widget.icon;

  return (
    <Card
      className={cn(
        'widget-palette-item group cursor-pointer transition-all duration-200 hover:shadow-md',
        isDragging && 'scale-95 opacity-50',
        isDraggable && 'cursor-grab active:cursor-grabbing',
      )}
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, widget.id)}
      onDragEnd={onDragEnd}
      onClick={() => onWidgetClick(widget.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <WidgetIcon
            icon={IconComponent}
            color={widget.color}
            bgColor={widget.bgColor}
          />

          <WidgetInfo widget={widget} isDraggable={isDraggable} />
        </div>
      </CardContent>
    </Card>
  );
}

interface WidgetIconProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function WidgetIcon({ icon: IconComponent, color, bgColor }: WidgetIconProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-2 transition-colors group-hover:scale-110',
        bgColor,
      )}
    >
      <IconComponent className={cn('h-5 w-5', color)} />
    </div>
  );
}

interface WidgetInfoProps {
  widget: (typeof WIDGET_CATEGORIES)[0]['widgets'][0];
  isDraggable: boolean;
}

function WidgetInfo({ widget, isDraggable }: WidgetInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <WidgetHeader widget={widget} isDraggable={isDraggable} />
      <WidgetDescription description={widget.description} />
      <WidgetSize defaultSize={widget.defaultSize} />
    </div>
  );
}

interface WidgetHeaderProps {
  widget: (typeof WIDGET_CATEGORIES)[0]['widgets'][0];
  isDraggable: boolean;
}

function WidgetHeader({ widget, isDraggable }: WidgetHeaderProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <h4 className="truncate text-sm font-medium">{widget.name}</h4>
      {isDraggable && (
        <GripVerticalIcon className="text-muted-foreground h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );
}

interface WidgetDescriptionProps {
  description: React.ReactNode;
}

function WidgetDescription({ description }: WidgetDescriptionProps) {
  return (
    <p className="text-muted-foreground mb-2 line-clamp-2 text-xs">
      {description}
    </p>
  );
}

interface WidgetSizeProps {
  defaultSize: { w: number; h: number };
}

function WidgetSize({ defaultSize }: WidgetSizeProps) {
  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className="text-xs">
        {defaultSize.w}×{defaultSize.h}
      </Badge>
    </div>
  );
}

// Simplified widget item for sidebar
export function WidgetPaletteItem({
  widget,
  onSelect,
  isDraggable = true,
}: {
  widget: WidgetObject;
  onSelect?: (widgetId: string) => void;
  isDraggable?: boolean;
}) {
  const IconComponent = widget.icon;

  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start p-2"
      draggable={isDraggable}
      onDragStart={(e) => {
        if (isDraggable) {
          e.dataTransfer.setData('widgetType', widget.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
      }}
      onClick={() => onSelect?.(widget.id)}
    >
      <div className="flex w-full items-center gap-2">
        <div className={cn('rounded p-1', widget.bgColor)}>
          <IconComponent className={cn('h-4 w-4', widget.color)} />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium">
            <Trans
              i18nKey={`dashboard:widgetPalette.widgets.${widget.id}.name`}
            />
          </p>

          <p className="text-muted-foreground truncate text-xs">
            <Trans
              i18nKey={`dashboard:widgetPalette.widgets.${widget.id}.description`}
            />
          </p>
        </div>

        {isDraggable && (
          <GripVerticalIcon className="text-muted-foreground h-3 w-3" />
        )}
      </div>
    </Button>
  );
}

function DraggableHandle() {
  return (
    <div className="bg-muted/50 mt-6 rounded-lg p-4">
      <p className="text-muted-foreground text-center text-sm">
        <GripVerticalIcon className="mr-1 inline h-4 w-4" />
        <Trans i18nKey="dashboard:widgetPalette.dragInstructions" />
      </p>
    </div>
  );
}
