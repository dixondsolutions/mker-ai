import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Outlet,
  useNavigate,
  useParams,
  useRouteLoaderData,
} from 'react-router';

import {
  ArrowLeftIcon,
  EditIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { DialogTrigger } from '@kit/ui/dialog';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { If } from '@kit/ui/if';
import { PageContent, PageLayout } from '@kit/ui/page';
import { Tabs, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { DashboardContext } from '../../hooks/use-dashboard-context';
import { useDashboardEditMode } from '../../hooks/use-dashboard-edit-mode';
import { useDashboardLayout } from '../../hooks/use-dashboard-layout';
import { dashboardStorage } from '../../lib/dashboard-storage';
import type {
  Dashboard,
  DashboardWidget,
  DashboardWithStats,
  WidgetType,
} from '../../types';
import { CreateWidgetWizard } from '../widgets/wizard/create-widget-wizard';
import { CreateDashboardDialog } from './create-dashboard-dialog';
import { DashboardActionsMenu } from './dashboard-actions-menu';

function DashboardEmptyLayout() {
  return (
    <PageLayout>
      <PageContent>
        <EmptyState
          className="flex h-96 items-center justify-center"
          data-testid="no-dashboards-empty-state"
        >
          <div className="flex flex-col items-center space-y-2 text-center">
            <LayoutDashboardIcon className="h-10 w-10" />

            <EmptyStateHeading className="text-lg font-semibold">
              <Trans i18nKey="dashboard:messages.noDashboardsFound" />
            </EmptyStateHeading>

            <EmptyStateText className="text-muted-foreground">
              <Trans i18nKey="dashboard:messages.getStartedByCreating" />
            </EmptyStateText>

            <CreateDashboardDialog>
              <DialogTrigger asChild>
                <EmptyStateButton data-testid="add-dashboard-button-empty">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  <Trans i18nKey="dashboard:actions.createDashboard" />
                </EmptyStateButton>
              </DialogTrigger>
            </CreateDashboardDialog>
          </div>
        </EmptyState>
      </PageContent>
    </PageLayout>
  );
}

interface DashboardActionsProps {
  onAddWidget: () => void;
  hasActiveDashboard: boolean;
  canEdit: boolean;
  // Edit mode props
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
}

function DashboardActions({
  onAddWidget,
  hasActiveDashboard,
  isEditing = false,
  canEdit,
  onToggleEdit,
  onReset,
  isSaving = false,
}: DashboardActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <If condition={!isEditing && hasActiveDashboard && canEdit}>
        <Button
          size="sm"
          onClick={onAddWidget}
          className="h-7 px-3 text-xs"
          data-testid="add-widget-button-header"
        >
          <PlusIcon className="mr-1.5 h-3 w-3" />
          <Trans i18nKey="dashboard:actions.addWidget" />
        </Button>
      </If>

      {/* Edit Mode Toggle */}
      <If condition={hasActiveDashboard && onToggleEdit && canEdit}>
        <ModeToggleButton
          disabled={false}
          isEditing={isEditing}
          onToggleEdit={onToggleEdit!}
          onReset={onReset}
          isSaving={isSaving}
        />
      </If>
    </div>
  );
}

interface DashboardTabBarProps {
  dashboards: DashboardWithStats[];
  activeDashboardId: string;
  widgetsCount: number;
  onTabChange: (dashboardId: string) => void;
  onAddWidget: () => void;
  // Edit mode props
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  canEdit?: boolean;
}

function DashboardTabBar({
  dashboards,
  activeDashboardId,
  onTabChange,
  onAddWidget,
  isEditing = false,
  onToggleEdit,
  onSave,
  onReset,
  isDirty = false,
  isSaving = false,
  canEdit = false,
}: DashboardTabBarProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const element = document.querySelector(
      `[data-dashboard-id="${activeDashboardId}"]`,
    );

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeDashboardId]);

  return (
    <div
      className="sticky top-0 z-10 mb-2.5 w-full border-b backdrop-blur-lg"
      data-testid="dashboard-tabs-container"
    >
      <div className="p-2">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
            <Tabs
              value={activeDashboardId}
              onValueChange={onTabChange}
              className="w-full"
            >
              <TabsList className="inline-flex h-8 w-max border">
                {dashboards.map((dashboard) => (
                  <div key={dashboard.id} className="flex items-center gap-1">
                    <TabsTrigger
                      value={dashboard.id}
                      className="data-[state=active]:bg-background h-6 px-3 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm"
                      data-testid="dashboard-tab"
                      data-dashboard-id={dashboard.id}
                    >
                      <span className="max-w-36 truncate">
                        {dashboard.name}
                      </span>
                    </TabsTrigger>

                    <If
                      condition={
                        !isEditing && activeDashboardId === dashboard.id
                      }
                    >
                      <DashboardActionsMenu
                        dashboard={dashboard}
                        canEdit={canEdit}
                      />
                    </If>
                  </div>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <If condition={!isEditing}>
              <CreateDashboardDialog>
                <Button
                  title={t('dashboard:actions.createDashboard')}
                  className="h-7 w-7"
                  size="sm"
                  variant="secondary"
                  data-testid="add-dashboard-button-header"
                >
                  <PlusIcon className="h-4 min-h-4 w-4 min-w-4" />
                </Button>
              </CreateDashboardDialog>
            </If>

            <DashboardActions
              onAddWidget={onAddWidget}
              hasActiveDashboard={!!activeDashboardId}
              isEditing={isEditing}
              onToggleEdit={onToggleEdit}
              onSave={onSave}
              onReset={onReset}
              isDirty={isDirty}
              isSaving={isSaving}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModeToggleButtonProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onReset?: () => void;
  isSaving: boolean;
  disabled: boolean;
}

function ModeToggleButton({
  isEditing,
  onToggleEdit,
  onReset,
  isSaving,
  disabled,
}: ModeToggleButtonProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={isSaving}
          size="sm"
          className="h-7 px-3 text-xs"
          data-testid="reset-layout-button"
        >
          <RotateCcwIcon className="mr-1.5 h-3 w-3" />
          <Trans i18nKey="dashboard:actions.reset" />
        </Button>

        <Button
          variant="outline"
          onClick={onToggleEdit}
          disabled={isSaving}
          size="sm"
          className="h-7 px-3 text-xs"
          data-testid="save-layout-button"
        >
          <ArrowLeftIcon className="mr-1.5 h-3 w-3" />
          <Trans i18nKey="dashboard:actions.exitAndSave" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      disabled={disabled || isSaving}
      variant="outline"
      onClick={onToggleEdit}
      size="sm"
      className="h-7 px-3 text-xs"
      data-testid="edit-mode-toggle"
    >
      <EditIcon className="mr-1 h-3 w-3" />
      <Trans i18nKey="dashboard:actions.edit" />
    </Button>
  );
}

function DashboardLayout() {
  const { dashboards = [] } =
    (useRouteLoaderData('dashboards') as {
      dashboards: DashboardWithStats[];
    }) || {};

  const dashboardRouteData = useRouteLoaderData('dashboard') as {
    dashboard: {
      dashboard: Dashboard | null;
      widgets: DashboardWidget[];
      canEdit: boolean;
      error?: string;
    };
  } | null;

  const activeDashboardId = useActiveDashboardId();

  const { activeDashboard, handleTabChange } =
    useDashboardNavigation(dashboards);

  const [isWidgetWizardOpen, setIsWidgetWizardOpen] = useState(false);

  const [editingWidget, setEditingWidget] = useState<
    DashboardWidget | undefined
  >();

  // Edit mode state management
  const { isEditing, toggleEditMode } = useDashboardEditMode();

  // Layout management for the active dashboard (only when editing)
  const { layout, updateLayout, saveLayout, resetLayout, isDirty, isSaving } =
    useDashboardLayout({
      dashboard: activeDashboard,
      widgets: dashboardRouteData?.dashboard?.widgets || [],
      enabled: isEditing && !!activeDashboard,
    });

  // Widget wizard handlers
  const openWidgetWizard = useCallback((widget?: DashboardWidget) => {
    setEditingWidget(widget);
    setIsWidgetWizardOpen(true);
  }, []);

  const closeWidgetWizard = useCallback(() => {
    setIsWidgetWizardOpen(false);
    setEditingWidget(undefined);
  }, []);

  const handleAddWidget = useCallback(() => {
    openWidgetWizard();
  }, [openWidgetWizard]);

  const handleSave = useCallback(() => {
    if (isDirty) {
      saveLayout();
    }
  }, [isDirty, saveLayout]);

  // Exit edit mode and save changes
  const handleExitAndSave = useCallback(() => {
    if (isEditing && isDirty) {
      saveLayout();
    }

    toggleEditMode();
  }, [isEditing, isDirty, saveLayout, toggleEditMode]);

  // Exit edit mode and discard changes
  const handleExitAndReset = useCallback(() => {
    if (isEditing) {
      resetLayout();
      toggleEditMode();
    }
  }, [isEditing, resetLayout, toggleEditMode]);

  // Create context value for child components
  const contextValue = {
    isEditing,
    onToggleEdit: toggleEditMode,
    onSave: handleSave,
    onReset: handleExitAndReset,
    isDirty,
    isSaving,
    canEdit: dashboardRouteData?.dashboard?.canEdit ?? false,
    layout,
    updateLayout,
    isWidgetWizardOpen,
    editingWidget,
    openWidgetWizard,
    closeWidgetWizard,
  };

  if (dashboards.length === 0) {
    return <DashboardEmptyLayout />;
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <PageLayout>
        <PageContent className="flex flex-1 flex-col space-y-0 overflow-y-auto p-0">
          <DashboardTabBar
            dashboards={dashboards}
            activeDashboardId={activeDashboardId}
            onTabChange={handleTabChange}
            onAddWidget={handleAddWidget}
            isEditing={isEditing}
            onToggleEdit={isEditing ? handleExitAndSave : toggleEditMode}
            onReset={handleExitAndReset}
            onSave={handleSave}
            isDirty={isDirty}
            isSaving={isSaving}
            widgetsCount={dashboardRouteData?.dashboard?.widgets.length ?? 0}
            canEdit={dashboardRouteData?.dashboard?.canEdit ?? false}
          />

          <div className="flex flex-1 flex-col">
            <Outlet />
          </div>

          <If condition={activeDashboardId}>
            {(dashboardId) => (
              <CreateWidgetWizard
                isOpen={isWidgetWizardOpen}
                onClose={closeWidgetWizard}
                onSuccess={closeWidgetWizard}
                dashboardId={dashboardId}
                editingWidget={editingWidget}
                initialData={
                  editingWidget
                    ? {
                        title: editingWidget.title,
                        type: editingWidget.widget_type as WidgetType,
                        schemaName: editingWidget.schema_name,
                        tableName: editingWidget.table_name,
                        config:
                          typeof editingWidget.config === 'string'
                            ? JSON.parse(editingWidget.config)
                            : editingWidget.config,
                      }
                    : undefined
                }
              />
            )}
          </If>
        </PageContent>
      </PageLayout>
    </DashboardContext.Provider>
  );
}

function useDashboardNavigation(dashboards: DashboardWithStats[]) {
  const navigate = useNavigate();
  const activeDashboardId = useActiveDashboardId();

  const handleTabChange = useCallback(
    (dashboardId: string) => {
      // Store the selected dashboard in session storage
      dashboardStorage.setLastDashboard(dashboardId);

      navigate(`/dashboards/${dashboardId}`);
    },
    [navigate],
  );

  // Store the current dashboard when it changes
  useEffect(() => {
    if (activeDashboardId) {
      dashboardStorage.setLastDashboard(activeDashboardId);
    }
  }, [activeDashboardId]);

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === activeDashboardId),
    [dashboards, activeDashboardId],
  );

  return {
    activeDashboard,
    handleTabChange,
  };
}

function useActiveDashboardId() {
  const params = useParams();
  return params['dashboardId'] || '';
}

export default DashboardLayout;
