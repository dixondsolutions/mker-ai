import { useCallback } from 'react';

import { useFetcher } from 'react-router';

import { permissionGroupsInSupamode } from '@kit/supabase/schema';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

type PermissionGroup = typeof permissionGroupsInSupamode.$inferSelect;

interface DeletePermissionGroupDialogProps {
  children: React.ReactNode;
  permissionGroup: PermissionGroup;
}

export function DeletePermissionGroupDialog({
  children,
  permissionGroup,
}: DeletePermissionGroupDialogProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

  const handleDeletePermissionGroup = useCallback(() => {
    const formData = new FormData();
    formData.append('intent', 'delete-permission-group');

    fetcher.submit(formData, {
      method: 'post',
    });
  }, [fetcher]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:permissions.deletePermissionGroup" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:permissions.deletePermissionGroupDescription" />
          </DialogDescription>
        </DialogHeader>

        <div>
          <p>
            <strong>
              <Trans i18nKey="settings:permissions.permissionGroup" />
            </strong>{' '}
            {permissionGroup.name}
          </p>

          <If condition={permissionGroup.description}>
            <p className="text-muted-foreground mb-4 text-sm">
              {permissionGroup.description}
            </p>
          </If>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <Trans i18nKey="common:cancel" />
            </Button>
          </DialogClose>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDeletePermissionGroup}
          >
            {isSubmitting ? (
              <Trans i18nKey="common:deleting" />
            ) : (
              <Trans i18nKey="common:deleteResource" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
