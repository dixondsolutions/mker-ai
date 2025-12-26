import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
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
import { Input } from '@kit/ui/input';
import { Skeleton } from '@kit/ui/skeleton';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';

import {
  permissionGroupPermissionsLoader,
  permissionsLoader,
} from '../../../loaders';

interface ManageGroupPermissionsDialogProps {
  groupId: string;
}

export function ManageGroupPermissionsDialog({
  groupId,
  children,
}: React.PropsWithChildren<ManageGroupPermissionsDialogProps>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:permissions.manageGroupPermissions" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:permissions.manageGroupPermissionsDescription" />
          </DialogDescription>
        </DialogHeader>

        <If condition={open}>
          <PermissionsDataProvider groupId={groupId}>
            {({ data, isLoading, refetch }) => (
              <ManageGroupPermissionsDialogContent
                setOpen={setOpen}
                data={data}
                isLoading={isLoading}
                refetch={refetch}
              />
            )}
          </PermissionsDataProvider>
        </If>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDataProvider(props: {
  groupId: string;
  children: (data: {
    data: ReturnType<typeof useFetchPermissions>['data'];
    isLoading: boolean;
    refetch: () => void;
  }) => React.ReactNode;
}) {
  const { groupId, children } = props;

  const { data, isLoading, refetch } = useFetchPermissions(groupId);

  if (isLoading) {
    return (
      <div className="py-2">
        <div className="relative">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="mt-4 max-h-[50vh] overflow-auto rounded border p-1">
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start space-x-4 rounded-md p-2"
              >
                <Skeleton className="mt-0.5 h-4 w-4" />
                <div className="grid w-full gap-0.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <div className="mt-2 flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return children({
    data,
    isLoading,
    refetch,
  });
}

function ManageGroupPermissionsDialogContent({
  setOpen,
  data,
  isLoading,
  refetch,
}: {
  setOpen: (isOpen: boolean) => void;
  data: ReturnType<typeof useFetchPermissions>['data'];
  isLoading: boolean;
  refetch: () => void;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher<{ success: boolean }>();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSaveChanges = useHandleSaveChangesMutation({
    fetcher,
  });

  const isSubmitting = fetcher.state === 'submitting';

  const initialAssignedIds = useMemo(() => {
    return new Set(
      data?.permissions.filter((p) => p.isAssigned).map((p) => p.id) || [],
    );
  }, [data]);

  // Fetch all permissions with assigned status
  const allPermissions = data?.permissions;

  const form = useForm({
    resolver: zodResolver(
      z.object({
        permissions: z.array(z.string().uuid()),
      }),
    ),
    defaultValues: {
      permissions: Array.from(initialAssignedIds),
    },
  });

  const selectedPermissionIds = useWatch({
    control: form.control,
    name: 'permissions',
  });

  const addedPermissions = useMemo(() => {
    return Array.from(selectedPermissionIds).filter(
      (id) => !initialAssignedIds.has(id),
    );
  }, [selectedPermissionIds, initialAssignedIds]);

  const removedPermissions = useMemo(() => {
    return Array.from(initialAssignedIds).filter(
      (id) => !selectedPermissionIds.includes(id),
    );
  }, [initialAssignedIds, selectedPermissionIds]);

  const handlePermissionToggle = useCallback(
    (permissionId: string) => {
      if (selectedPermissionIds.includes(permissionId)) {
        form.setValue(
          'permissions',
          selectedPermissionIds.filter((id) => id !== permissionId),
          {
            shouldValidate: true,
          },
        );
      } else {
        form.setValue('permissions', [...selectedPermissionIds, permissionId], {
          shouldValidate: true,
        });
      }
    },
    [form, selectedPermissionIds],
  );

  // Filter and sort permissions
  const filteredPermissions = useMemo(() => {
    return (
      searchTerm
        ? (allPermissions ?? []).filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.description &&
                p.description.toLowerCase().includes(searchTerm.toLowerCase())),
          )
        : (allPermissions ?? [])
    ).sort((a, b) => {
      if (a.isAssigned && !b.isAssigned) return -1;
      if (!a.isAssigned && b.isAssigned) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [allPermissions, searchTerm]);

  const getPermissionName = useCallback(
    (permissionId: string) => {
      return (allPermissions ?? []).find((p) => p.id === permissionId)?.name;
    },
    [allPermissions],
  );

  useEffect(() => {
    if (fetcher.data?.success) {
      refetch();
      setOpen(false);
    }
  }, [fetcher.data, refetch, setOpen]);

  return (
    <>
      <div
        className="py-2"
        data-testid="manage-group-permissions-dialog-content"
      >
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

          <Input
            data-testid="manage-group-permissions-dialog-search-input"
            placeholder={t('settings:permissions.searchPermissions')}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="mt-4 max-h-[50vh] overflow-auto rounded border p-1">
          <If
            condition={!isLoading}
            fallback={
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground text-sm">
                  <Trans i18nKey="settings:permissions.loadingPermissions" />
                </span>
              </div>
            }
          >
            <If
              condition={filteredPermissions.length > 0}
              fallback={
                <div className="flex items-center justify-center py-8">
                  <span className="text-muted-foreground text-sm">
                    {searchTerm
                      ? t('settings:permissions.noMatchingPermissionsFound')
                      : t('settings:permissions.noPermissionsAvailable')}
                  </span>
                </div>
              }
            >
              <div className="space-y-2 p-2">
                {filteredPermissions.map((permission) => (
                  <label
                    key={permission.id}
                    className={`hover:bg-muted flex cursor-pointer items-start space-x-4 rounded-md p-2.5 ${
                      permission.isAssigned ? 'bg-muted/40' : ''
                    }`}
                  >
                    <Checkbox
                      data-testid={`manage-group-permissions-dialog-permission-checkbox`}
                      data-value={permission.id}
                      className="mt-0.5"
                      id={permission.id}
                      checked={selectedPermissionIds.includes(permission.id)}
                      onCheckedChange={() =>
                        handlePermissionToggle(permission.id)
                      }
                    />

                    <span className="grid gap-0.5">
                      <span className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <span className="font-medium">{permission.name}</span>

                        <If condition={permission.isAssigned}>
                          <Badge variant="outline" className="ml-2 text-xs">
                            <Trans i18nKey="settings:permissions.assigned" />
                          </Badge>
                        </If>
                      </span>

                      <If condition={permission.description}>
                        <span className="text-muted-foreground text-xs">
                          {permission.description}
                        </span>
                      </If>

                      <span className="mt-2.5 flex items-center gap-2">
                        <If condition={permission.scope}>
                          <Badge variant="outline" className="text-xs">
                            <Trans i18nKey="settings:permissions.scope" />:{' '}
                            {permission.scope}
                          </Badge>
                        </If>

                        <Badge variant="outline" className="text-xs">
                          <Trans i18nKey="settings:permissions.action" />:{' '}
                          {permission.action}
                        </Badge>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </If>
          </If>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <If condition={addedPermissions.length > 0}>
            <div>
              <span className="text-sm font-medium">
                <Trans i18nKey="settings:permissions.addedPermissions" />
              </span>

              <div className="flex flex-wrap gap-2">
                {addedPermissions.map((permission) => (
                  <Badge variant={'secondary'} key={permission}>
                    {getPermissionName(permission)}
                  </Badge>
                ))}
              </div>
            </div>
          </If>

          <If condition={removedPermissions.length > 0}>
            <div>
              <span className="text-sm font-medium">
                <Trans i18nKey="settings:permissions.removedPermissions" />
              </span>

              <div className="flex flex-wrap gap-2">
                {removedPermissions.map((permission) => (
                  <Badge variant={'secondary'} key={permission}>
                    {getPermissionName(permission)}
                  </Badge>
                ))}
              </div>
            </div>
          </If>
        </div>
      </div>

      <DialogFooter className="sm:justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            <Trans i18nKey="common:cancel" />
          </Button>
        </DialogClose>

        <Button
          data-testid="manage-group-permissions-dialog-save-changes-button"
          type="button"
          disabled={
            (addedPermissions.length === 0 &&
              removedPermissions.length === 0) ||
            isSubmitting
          }
          onClick={() => {
            handleSaveChanges({
              selectedPermissionIds,
              initialAssignedIds,
            });
          }}
        >
          {isSubmitting ? (
            <Trans i18nKey="common:saving" />
          ) : (
            <Trans i18nKey="common:saveChanges" />
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function useHandleSaveChangesMutation(params: {
  fetcher: ReturnType<typeof useFetcher>;
}) {
  const { fetcher } = params;
  const { t } = useTranslation();

  return useCallback(
    async (props: {
      selectedPermissionIds: string[];
      initialAssignedIds: Set<string>;
    }) => {
      const { selectedPermissionIds, initialAssignedIds } = props;

      const toAdd: string[] = [];
      const toRemove: string[] = [];

      // Check which permissions to add (selected but not initially assigned)
      selectedPermissionIds.forEach((id) => {
        if (!initialAssignedIds.has(id)) {
          toAdd.push(id);
        }
      });

      // Check which permissions to remove (initially assigned but not selected)
      initialAssignedIds.forEach((id) => {
        if (!selectedPermissionIds.includes(id)) {
          toRemove.push(id);
        }
      });

      // Only make API calls if there are changes
      if (toAdd.length > 0 || toRemove.length > 0) {
        fetcher.submit(
          {
            intent: 'set-permissions',
            data: JSON.stringify({ toAdd, toRemove }),
          },
          {
            method: 'POST',
          },
        );
      } else {
        toast.info(t('settings:permissions.noPermissionChangesToSave'));
      }
    },
    [fetcher, t],
  );
}

function useFetchPermissions(groupId: string) {
  return useQuery({
    queryKey: ['allPermissionsForGroup', groupId],
    queryFn: async () => {
      const [allResponse, groupResponse] = await Promise.all([
        permissionsLoader(),
        permissionGroupPermissionsLoader(groupId),
      ]);

      // Create a set of assigned permission IDs
      const assignedIds = new Set(groupResponse.permissions.map((p) => p.id));

      // Mark permissions as assigned or not
      const permissionsWithStatus = allResponse.permissions.map(
        (permission) => ({
          ...permission,
          isAssigned: assignedIds.has(permission.id),
        }),
      );

      return { permissions: permissionsWithStatus };
    },
  });
}
