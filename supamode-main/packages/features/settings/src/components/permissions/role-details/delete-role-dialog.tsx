import { useFetcher } from 'react-router';

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
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

interface DeleteRoleDialogProps {
  children: React.ReactNode;
  roleName: string;
  roleDescription?: string;
}

export function DeleteRoleDialog({
  children,
  roleName,
  roleDescription,
}: DeleteRoleDialogProps) {
  const fetcher = useFetcher();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent
        className="sm:max-w-[450px]"
        data-testid="delete-role-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="settings:roles.delete" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="settings:roles.deleteDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <p className="mb-2">
            <Trans i18nKey="settings:roles.role" />: {roleName}
          </p>

          <If condition={roleDescription}>
            <p className="text-muted-foreground text-sm">{roleDescription}</p>
          </If>

          <p className="text-destructive mt-4 text-sm font-medium">
            <Trans i18nKey="settings:roles.deleteWarning" />
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey="common:cancel" />
          </AlertDialogCancel>

          <Button
            data-testid="delete-role-dialog-delete-button"
            type="button"
            variant="destructive"
            onClick={() => {
              return fetcher.submit(
                {
                  intent: 'delete-role',
                },
                {
                  method: 'POST',
                },
              );
            }}
          >
            <Trans i18nKey="settings:roles.delete" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
