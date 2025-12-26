import { useCallback, useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { MoreHorizontalIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

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
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { Dashboard } from '../../types';

/**
 * Schema for renaming a dashboard. Built with i18n messages.
 */
const createRenameDashboardSchema = (t: TFunction, currentName: string) =>
  z.object({
    name: z
      .string()
      .min(1, t('dashboard:errors.nameRequired'))
      .max(255, t('dashboard:errors.nameMax', { max: 255 }))
      .refine((name) => name !== currentName, {
        message: t('dashboard:errors.nameMustBeDifferent'),
      }),
  });

type RenameDashboardType = z.infer<
  ReturnType<typeof createRenameDashboardSchema>
>;

interface DashboardActionsMenuProps {
  dashboard: Dashboard;
  canEdit?: boolean;
}

export function DashboardActionsMenu({
  dashboard,
  canEdit = false,
}: DashboardActionsMenuProps) {
  // If user has no edit permissions, don't show the menu at all
  if (!canEdit) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          data-testid="dashboard-actions-menu"
        >
          <MoreHorizontalIcon className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <RenameDashboardDialog dashboard={dashboard}>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            data-testid="rename-dashboard-button"
          >
            <PencilIcon className="mr-2 h-3 w-3" />
            <Trans i18nKey="dashboard:actions.renameDashboard" />
          </DropdownMenuItem>
        </RenameDashboardDialog>

        <DeleteDashboardDialog dashboard={dashboard}>
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-destructive focus:text-destructive"
            data-testid="delete-dashboard-button"
          >
            <TrashIcon className="mr-2 h-3 w-3" />
            <Trans i18nKey="dashboard:actions.deleteDashboard" />
          </DropdownMenuItem>
        </DeleteDashboardDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RenameDashboardDialogProps {
  dashboard: Dashboard;
}

function RenameDashboardDialog({
  dashboard,
  children,
}: React.PropsWithChildren<RenameDashboardDialogProps>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="dashboard:actions.renameDashboard" />
          </DialogTitle>
        </DialogHeader>

        <RenameDashboardForm
          dashboard={dashboard}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function RenameDashboardForm({
  dashboard,
  onSuccess,
}: RenameDashboardDialogProps & { onSuccess: () => void }) {
  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const { t } = useTranslation();

  const form = useForm({
    resolver: zodResolver(createRenameDashboardSchema(t, dashboard.name)),
    defaultValues: {
      name: dashboard.name,
    },
  });

  const dashboardName = useWatch({ control: form.control, name: 'name' });
  const isSubmitting = fetcher.state === 'submitting';

  // Close dialog on successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess();
    }
  }, [fetcher.data, onSuccess]);

  const handleSubmit = useCallback(
    (data: RenameDashboardType) => {
      if (data.name.trim() !== dashboard.name) {
        fetcher.submit(
          JSON.stringify({
            name: data.name.trim(),
          }),
          {
            method: 'PUT',
            action: `dashboards/${dashboard.id}`,
            encType: 'application/json',
          },
        );
      }
    },
    [fetcher, dashboard.id, dashboard.name],
  );

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="dashboard:labels.name" />
                </FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('dashboard:placeholders.enterDashboardName')}
                    autoFocus
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                <Trans i18nKey="common:cancel" />
              </Button>
            </DialogClose>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !form.formState.isValid ||
                dashboardName === dashboard.name
              }
            >
              {isSubmitting ? (
                <Trans i18nKey="dashboard:actions.saving" />
              ) : (
                <Trans i18nKey="common:save" />
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

interface DeleteDashboardDialogProps {
  dashboard: Dashboard;
  children: React.ReactNode;
}

function DeleteDashboardDialog({
  dashboard,
  children,
}: DeleteDashboardDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-[450px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="dashboard:actions.deleteDashboard" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="dashboard:messages.areYouSureDeleteDashboard"
              values={{ name: dashboard.name }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-destructive mt-4 text-sm font-medium">
          <Trans i18nKey="dashboard:messages.actionCannotBeUndone" />
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey="common:cancel" />
          </AlertDialogCancel>

          <DeleteDashboardForm id={dashboard.id} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteDashboardForm({ id }: { id: string }) {
  const fetcher = useFetcher();

  const handleDelete = useCallback(() => {
    fetcher.submit(null, {
      method: 'DELETE',
      action: `dashboards/${id}`,
    });
  }, [fetcher, id]);

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={fetcher.state === 'submitting'}
      data-testid="confirm-delete-dashboard"
    >
      {fetcher.state === 'submitting' ? (
        <Trans i18nKey="common:deleting" />
      ) : (
        <Trans i18nKey="dashboard:actions.delete" />
      )}
    </Button>
  );
}
