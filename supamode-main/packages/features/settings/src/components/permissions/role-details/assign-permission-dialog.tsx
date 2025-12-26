import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, MinusIcon, PlusIcon, Search } from 'lucide-react';
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
import { cn } from '@kit/ui/utils';

import { allPermissionsWithStatusLoader } from '../../../loaders';

interface AssignPermissionDialogProps {
  roleId: string;
}

export function AssignPermissionDialog({
  roleId,
  children,
}: React.PropsWithChildren<AssignPermissionDialogProps>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="sm:max-w-lg"
        data-testid="manage-role-permissions-dialog-content"
      >
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:permissions.manageRolePermissions" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:permissions.manageRolePermissionsDescription" />
          </DialogDescription>
        </DialogHeader>

        <If condition={open}>
          <PermissionsDataProvider roleId={roleId}>
            {({ data, isLoading, refetch }) => (
              <AssignPermissionDialogContent
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
  roleId: string;
  children: (data: {
    data: ReturnType<typeof useFetchPermissions>['data'];
    isLoading: boolean;
    refetch: () => void;
  }) => React.ReactNode;
}) {
  const { roleId, children } = props;

  const { data, isLoading, refetch } = useFetchPermissions(roleId);

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

function AssignPermissionDialogContent({
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
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const isSubmitting = fetcher.state === 'submitting';

  const [searchTerm, setSearchTerm] = useState('');

  const allPermissions = data?.permissions;

  const initialAssignedIds = useMemo(() => {
    return new Set(
      data?.permissions.filter((p) => p.isAssigned).map((p) => p.id) || [],
    );
  }, [data]);

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

  const handleSaveChanges = useHandleSaveChangesMutation({
    fetcher,
    setOpen,
  });

  // Filter permissions based on search term
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
      if (a.isAssigned && !b.isAssigned) {
        return -1;
      }

      if (!a.isAssigned && b.isAssigned) {
        return 1;
      }

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
  }, [fetcher.data?.success, refetch, setOpen]);

  return (
    <>
      <div className="py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

          <Input
            data-testid="manage-role-permissions-dialog-search-input"
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
                    className={cn(
                      `hover:bg-muted/50 flex cursor-pointer items-start space-x-4 rounded-md p-2`,
                      {
                        'bg-muted/50':
                          permission.isAssigned ||
                          selectedPermissionIds.includes(permission.id),
                      },
                    )}
                  >
                    <Checkbox
                      data-testid="manage-role-permissions-dialog-permission-checkbox"
                      id={permission.id}
                      checked={selectedPermissionIds.includes(permission.id)}
                      onCheckedChange={() =>
                        handlePermissionToggle(permission.id)
                      }
                    />

                    <span className="grid w-full gap-0.5">
                      <span className="flex w-full cursor-pointer justify-between text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <span>
                          <span>{permission.name}</span>

                          <If
                            condition={
                              permission.isAssigned &&
                              !removedPermissions.includes(permission.id)
                            }
                          >
                            <Badge variant="outline" className="ml-4 text-xs">
                              <CheckIcon className="mr-2 h-3 w-3" />
                              <Trans i18nKey="settings:permissions.assigned" />
                            </Badge>
                          </If>
                        </span>

                        <If
                          condition={removedPermissions.includes(permission.id)}
                        >
                          <Badge variant="outline" className="ml-4 text-xs">
                            <MinusIcon className="mr-2 h-3 w-3" />
                            <Trans i18nKey="settings:permissions.removing" />
                          </Badge>
                        </If>

                        <If
                          condition={
                            selectedPermissionIds.includes(permission.id) &&
                            !permission.isAssigned
                          }
                        >
                          <Badge variant="outline" className="ml-4 text-xs">
                            <PlusIcon className="mr-2 h-3 w-3" />
                            <Trans i18nKey="settings:permissions.assigning" />
                          </Badge>
                        </If>
                      </span>

                      <If condition={permission.description}>
                        <span className="text-muted-foreground text-xs">
                          {permission.description}
                        </span>
                      </If>

                      <span className="mt-2 flex items-center gap-2">
                        <Badge
                          variant={
                            permission.permissionType === 'system'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {permission.permissionType}
                        </Badge>

                        <If condition={permission.scope}>
                          <Badge variant="outline" className="text-xs">
                            {permission.scope}
                          </Badge>
                        </If>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </If>
          </If>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <If condition={addedPermissions.length > 0}>
            <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
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
          data-testid={`manage-role-permissions-dialog-save-changes-button`}
          type="button"
          disabled={
            isSubmitting ||
            (addedPermissions.length === 0 && removedPermissions.length === 0)
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
  setOpen: (isOpen: boolean) => void;
}) {
  const { fetcher, setOpen } = params;
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

      // Only make API call if there are changes
      if (toAdd.length > 0 || toRemove.length > 0) {
        void fetcher.submit(
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
        setOpen(false);
      }
    },
    [fetcher, t, setOpen],
  );
}

function useFetchPermissions(roleId: string) {
  return useQuery({
    queryKey: ['allPermissionsWithStatus', roleId],
    queryFn: async () => {
      return allPermissionsWithStatusLoader(roleId);
    },
  });
}
