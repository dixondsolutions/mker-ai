import { useCallback } from 'react';

import { useFetcher } from 'react-router';

import {
  EditIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  TrashIcon,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Trans } from '@kit/ui/trans';

interface WidgetActionsMenuProps {
  onRefresh: () => void;
  onEdit: () => void;
  isRefreshing: boolean;
  dashboardId: string;
  widgetId: string;
  canEdit?: boolean;
}

export function WidgetActionsMenu({
  onRefresh,
  isRefreshing,
  widgetId,
  onEdit,
  dashboardId,
  canEdit = false,
}: WidgetActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover/widget:opacity-100"
        >
          <MoreHorizontalIcon className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <RefreshAction
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          widgetId={widgetId}
        />

        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <EditAction widgetId={widgetId} onEdit={onEdit} />
            <DropdownMenuSeparator />
            <DeleteAction dashboardId={dashboardId} widgetId={widgetId} />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RefreshActionProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  widgetId: string;
}

function RefreshAction({
  onRefresh,
  isRefreshing,
  widgetId,
}: RefreshActionProps) {
  return (
    <DropdownMenuItem
      onClick={onRefresh}
      disabled={isRefreshing}
      data-testid="widget-refresh-button"
      data-widget-id={widgetId}
    >
      <RefreshCwIcon className="mr-2 h-3 w-3" />
      <Trans i18nKey="dashboard:widgetContainer.refreshData" />
    </DropdownMenuItem>
  );
}

interface EditActionProps {
  onEdit: () => void;
  widgetId: string;
}

function EditAction({ onEdit, widgetId }: EditActionProps) {
  return (
    <DropdownMenuItem
      onClick={onEdit}
      data-testid="widget-edit-button"
      data-widget-id={widgetId}
    >
      <EditIcon className="mr-2 h-3 w-3" />
      <Trans i18nKey="dashboard:widgetContainer.editWidget" />
    </DropdownMenuItem>
  );
}

interface DeleteActionProps {
  dashboardId: string;
  widgetId: string;
}

function DeleteAction({ dashboardId, widgetId }: DeleteActionProps) {
  const fetcher = useFetcher();

  const handleDelete = useCallback(() => {
    fetcher.submit(JSON.stringify({}), {
      method: 'DELETE',
      action: `/dashboards/${dashboardId}/widgets/${widgetId}`,
      encType: 'application/json',
    });
  }, [fetcher, dashboardId, widgetId]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="text-destructive focus:text-destructive"
          data-testid="widget-delete-button"
          data-widget-id={widgetId}
        >
          <TrashIcon className="mr-2 h-3 w-3" />
          <Trans i18nKey="dashboard:widgetContainer.deleteWidget" />
        </DropdownMenuItem>
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-[450px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="dashboard:widgetContainer.deleteWidget" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="dashboard:widgetContainer.confirmDeleteWidget" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-destructive text-sm font-medium">
          <Trans i18nKey="dashboard:messages.actionCannotBeUndone" />
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey="common:cancel" />
          </AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            data-testid="confirm-delete-widget"
          >
            <Trans i18nKey="dashboard:widgetContainer.deleteWidget" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
