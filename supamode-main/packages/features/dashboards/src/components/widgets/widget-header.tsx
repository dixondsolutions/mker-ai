import { CardTitle } from '@kit/ui/card';
import { If } from '@kit/ui/if';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import { useDashboardContext } from '../../hooks/use-dashboard-context';
import { formatLastUpdated } from '../../lib/widget-utils';
import type { DashboardWidget } from '../../types';
import { WidgetActionsMenu } from './widget-actions-menu';

interface WidgetHeaderProps {
  widget: DashboardWidget;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshInterval: number;
  lastUpdated?: string;
  isEditing?: boolean;
  dashboardId: string;
  onRefresh: () => void;
}

export function WidgetHeader({
  widget,
  dashboardId,
  isLoading,
  isRefreshing,
  refreshInterval,
  lastUpdated,
  onRefresh,
  isEditing,
}: WidgetHeaderProps) {
  const { openWidgetWizard } = useDashboardContext();

  return (
    <div
      className="space-y-0"
      data-testid="widget-header"
      data-widget-id={widget.id}
    >
      <div className="flex items-center justify-between">
        <WidgetTitleSection widget={widget} />

        <WidgetIndicators
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          refreshInterval={refreshInterval}
          onRefresh={onRefresh}
          dashboardId={dashboardId}
          widgetId={widget.id}
          isEditing={isEditing}
          onEdit={() => openWidgetWizard(widget)}
        />
      </div>

      <If condition={lastUpdated}>
        <LastUpdatedTimestamp lastUpdated={lastUpdated!} />
      </If>
    </div>
  );
}

interface WidgetTitleSectionProps {
  widget: DashboardWidget;
}

function WidgetTitleSection({ widget }: WidgetTitleSectionProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <CardTitle
        className="truncate text-sm font-medium"
        data-testid="widget-title"
        data-widget-id={widget.id}
      >
        {widget.title}
      </CardTitle>
    </div>
  );
}

interface WidgetIndicatorsProps {
  isLoading: boolean;
  isRefreshing: boolean;
  refreshInterval: number;
  onRefresh: () => void;
  dashboardId: string;
  widgetId: string;
  onEdit: () => void;
  isEditing?: boolean;
}

function WidgetIndicators({
  isLoading,
  isRefreshing,
  isEditing,
  widgetId,
  dashboardId,
  onRefresh,
  onEdit,
}: WidgetIndicatorsProps) {
  const { canEdit } = useDashboardContext();
  return (
    <div className="flex items-center gap-1">
      <If condition={isRefreshing || isLoading}>
        <Spinner className="h-3 w-3" />
      </If>

      <If condition={!isEditing}>
        <WidgetActionsMenu
          onRefresh={onRefresh}
          dashboardId={dashboardId}
          isRefreshing={isRefreshing}
          widgetId={widgetId}
          onEdit={onEdit}
          canEdit={canEdit}
        />
      </If>
    </div>
  );
}

interface LastUpdatedTimestampProps {
  lastUpdated: string;
}

function LastUpdatedTimestamp({ lastUpdated }: LastUpdatedTimestampProps) {
  return (
    <p className="text-muted-foreground text-xs">
      <Trans i18nKey="dashboard:widgetContainer.updated" />{' '}
      {formatLastUpdated(lastUpdated)}
    </p>
  );
}
