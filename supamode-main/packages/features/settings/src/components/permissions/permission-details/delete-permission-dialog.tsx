import { useCallback, useEffect } from 'react';

import { useFetcher, useNavigate } from 'react-router';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Trans } from '@kit/ui/trans';

type DeletePermissionDialogProps = React.PropsWithChildren<{
  permissionId: string;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    rank: number | null;
  }>;
  groups: Array<{ id: string; name: string; description: string | null }>;
}>;

export function DeletePermissionDialog({
  children,
  roles,
  groups,
}: DeletePermissionDialogProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  const handleDeletePermission = useCallback(() => {
    const formData = new FormData();

    formData.append('intent', 'delete-permission');

    fetcher.submit(formData, {
      method: 'post',
    });
  }, [fetcher]);

  useEffect(() => {
    if (fetcher.data?.success) {
      navigate('/settings/permissions?tab=permissions');
    }
  }, [fetcher.data?.success, navigate]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="settings:permissions.deletePermission" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="settings:permissions.deletePermissionDescription" />

            {roles.length > 0 && (
              <p className="mt-2.5">
                <p className="text-destructive font-semibold">
                  <Trans i18nKey="settings:permissions.rolesUsingThisPermissionWarning" />
                </p>

                <ul className="mt-2 list-disc pl-5">
                  {roles.map((role) => (
                    <li key={role.id}>{role.name}</li>
                  ))}
                </ul>
              </p>
            )}
            {groups.length > 0 && (
              <p className="mt-2.5">
                <p className="text-destructive font-semibold">
                  <Trans i18nKey="settings:permissions.groupsUsingThisPermissionWarning" />
                </p>

                <ul className="mt-2 list-disc pl-5">
                  {groups.map((group) => (
                    <li key={group.id}>{group.name}</li>
                  ))}
                </ul>
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            <Trans i18nKey="common:cancel" />
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleDeletePermission}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <Trans i18nKey="common:deleting" />
            ) : (
              <Trans i18nKey="common:deleteResource" />
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
