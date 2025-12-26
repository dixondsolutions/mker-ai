import { useCallback } from 'react';

import { useRouteLoaderData } from 'react-router';

import { ChartNoAxesCombinedIcon, PlusIcon } from 'lucide-react';

import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { Trans } from '@kit/ui/trans';

import { useDashboardContext } from '../../hooks/use-dashboard-context';
import type { Dashboard, DashboardWidget, Layout } from '../../types';
import { DashboardGrid } from './dashboard-grid';
import { DashboardNotFound } from './dashboard-not-found';

interface DashboardPageData {
  dashboard: {
    dashboard: Dashboard | null;
    widgets: DashboardWidget[];
    error?: string;
  };
}

export default function DashboardPage() {
  const routeData = useRouteLoaderData('dashboard') as DashboardPageData;

  // Get edit mode state from parent layout context
  const parentContext = useDashboardContext();

  // Use parent's layout management from context
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (parentContext.isEditing && parentContext.updateLayout) {
        parentContext.updateLayout(newLayout);
      }
    },
    [parentContext],
  );

  // Check if dashboard data exists before destructuring
  if (!routeData.dashboard) {
    return <DashboardNotFound />;
  }

  const { dashboard, widgets } = routeData.dashboard;

  // Check if dashboard was not found
  if (!dashboard || routeData.dashboard.error === 'Dashboard not found') {
    return <DashboardNotFound />;
  }

  if (widgets.length === 0) {
    return <DashboardEmptyState dashboard={dashboard!} />;
  }

  return (
    <div
      className="flex h-full flex-1 flex-col space-y-4"
      data-testid="dashboard-grid-container"
    >
      <DashboardGrid
        dashboard={dashboard}
        widgets={widgets}
        isEditing={parentContext.isEditing}
        layout={parentContext.layout}
        onLayoutChange={handleLayoutChange}
        onWidgetAdd={parentContext.openWidgetWizard}
      />
    </div>
  );
}

interface DashboardEmptyStateProps {
  dashboard: Dashboard;
}

function DashboardEmptyState({ dashboard }: DashboardEmptyStateProps) {
  const { openWidgetWizard, canEdit } = useDashboardContext();

  return (
    <EmptyState
      className="m-2 mt-0 flex h-96 items-center justify-center"
      data-testid="dashboard-empty-state"
    >
      <div className="space-y-4 text-center">
        <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-lg">
          <ChartNoAxesCombinedIcon className="text-muted-foreground h-8 w-8" />
        </div>

        <EmptyStateHeading className="text-lg font-semibold">
          {dashboard.name}
        </EmptyStateHeading>

        <EmptyStateText className="text-muted-foreground text-sm">
          <Trans i18nKey="dashboard:messages.dashboardIsEmpty" />
        </EmptyStateText>

        {canEdit && (
          <EmptyStateButton
            onClick={() => openWidgetWizard()}
            data-testid="add-widget-button-empty"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            <Trans i18nKey="dashboard:actions.addWidget" />
          </EmptyStateButton>
        )}
      </div>
    </EmptyState>
  );
}
