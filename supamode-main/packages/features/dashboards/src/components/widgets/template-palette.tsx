import { useFetcher, useParams } from 'react-router';

import {
  BarChart3Icon,
  CheckIcon,
  PlusCircleIcon,
  TableIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { getWidgetTemplates } from '../../lib/widget-templates';
import type {
  WidgetTemplate,
  WidgetTemplateItem,
} from '../../types/widget-templates';

interface TemplatePaletteProps {
  className?: string;
  onTemplateApplied?: () => void;
}

export function TemplatePalette({
  className,
  onTemplateApplied,
}: TemplatePaletteProps) {
  const templates = getWidgetTemplates();
  const params = useParams();
  const dashboardId = params['dashboardId'];

  return (
    <div className={cn('template-palette', className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          <Trans i18nKey="dashboard:templates.title" />
        </h3>

        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="dashboard:templates.description" />
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            dashboardId={dashboardId}
            onApplied={onTemplateApplied}
          />
        ))}
      </div>

      <If condition={templates.length === 0}>
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          <p>
            <Trans i18nKey="dashboard:templates.noTemplates" />
          </p>
        </div>
      </If>
    </div>
  );
}

interface TemplateCardProps {
  template: WidgetTemplate;
  dashboardId?: string;
  onApplied?: () => void;
}

function TemplateCard({ template, dashboardId, onApplied }: TemplateCardProps) {
  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded">
            <TemplateIcon
              iconName={template.icon}
              className="text-primary h-4 w-4"
            />
          </div>

          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">{template.name}</CardTitle>

            <p className="text-muted-foreground text-xs">
              {template.metadata.widgetCount} widgets
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <CardDescription className="text-xs">
          {template.description}
        </CardDescription>

        {/* Grid layout for widgets */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {template.widgets.map((widget, index) => (
            <WidgetTemplateItemCard
              key={index}
              widget={widget}
              dashboardId={dashboardId}
              onAdded={onApplied}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual widget template item card with add button
 */
interface WidgetTemplateItemCardProps {
  widget: WidgetTemplateItem;
  dashboardId?: string;
  onAdded?: () => void;
}

function WidgetTemplateItemCard({
  widget,
  dashboardId,
  onAdded,
}: WidgetTemplateItemCardProps) {
  const fetcher = useFetcher<{
    success: boolean;
    data?: { id: string };
  }>();

  const isSubmitting = fetcher.state === 'submitting';
  const isSuccess = fetcher.data?.success === true;

  const handleAddWidget = () => {
    if (!dashboardId) {
      console.error('Dashboard ID is required to add widget');
      return;
    }

    const widgetData = {
      dashboardId,
      widgetType: widget.type,
      title: widget.title,
      schemaName: widget.schemaName,
      tableName: widget.tableName,
      config: widget.config,
      position: widget.position,
    };

    fetcher.submit(JSON.stringify(widgetData), {
      method: 'POST',
      action: `/dashboards/${dashboardId}/widgets`,
      encType: 'application/json',
    });
  };

  // Call onAdded when widget is successfully created
  if (isSuccess && onAdded) {
    requestAnimationFrame(() => {
      onAdded();
    });
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded border p-2 transition-all',
        isSuccess ? 'border-green-500 bg-green-50/50' : '',
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded',
            isSuccess ? 'bg-green-500 text-white' : 'bg-muted',
          )}
        >
          {isSuccess ? (
            <CheckIcon className="h-3 w-3" />
          ) : (
            <WidgetTypeIcon type={widget.type} className="h-3 w-3" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {widget.title}{' '}
            <span className="text-muted-foreground capitalize">
              ({widget.type})
            </span>
          </p>
        </div>
      </div>

      <Button
        size="sm"
        variant={isSuccess ? 'outline' : 'default'}
        onClick={handleAddWidget}
        disabled={isSubmitting || isSuccess}
        className="h-7 w-full text-xs"
      >
        {isSubmitting ? (
          <Trans i18nKey="dashboard:templates.adding" />
        ) : isSuccess ? (
          <Trans i18nKey="dashboard:templates.added" />
        ) : (
          <>
            <PlusCircleIcon className="mr-1 h-3 w-3" />
            <Trans i18nKey="dashboard:templates.add" />
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Widget type icon component
 */
function WidgetTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    chart: BarChart3Icon,
    metric: TrendingUpIcon,
    table: TableIcon,
  };

  const Icon = iconMap[type] || BarChart3Icon;

  return <Icon className={className} />;
}

/**
 * Template icon component that renders the appropriate lucide icon
 */
function TemplateIcon({
  iconName,
  className,
}: {
  iconName?: string;
  className?: string;
}) {
  // Map icon names to components
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Users: UsersIcon,
    // Add more icon mappings as needed
  };

  const Icon = iconMap[iconName || 'Users'] || UsersIcon;

  return <Icon className={className} />;
}
