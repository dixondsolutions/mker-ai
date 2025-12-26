import { useCallback, useEffectEvent, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { useQuery } from '@tanstack/react-query';
import { CheckIcon, MinusIcon, PlusIcon, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { allPermissionGroupsWithStatusLoader } from '../../../loaders';

interface AssignPermissionGroupDialogProps {
  roleId: string;
}

export function AssignPermissionGroupDialog({
  roleId,
  children,
}: React.PropsWithChildren<AssignPermissionGroupDialogProps>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:permissions.manageRolePermissionGroups" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:permissions.manageRolePermissionGroupsDescription" />
          </DialogDescription>
        </DialogHeader>

        <AssignPermissionGroupDialogContent roleId={roleId} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

function AssignPermissionGroupDialogContent({
  roleId,
  setOpen,
}: {
  roleId: string;
  setOpen: (isOpen: boolean) => void;
}) {
  const fetcher = useFetcher();
  const { t } = useTranslation();
  const isSubmitting = fetcher.state === 'submitting';

  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(),
  );

  const [initialAssignedIds, setInitialAssignedIds] = useState<Set<string>>(
    new Set(),
  );

  const addedGroups = useMemo(() => {
    return Array.from(selectedGroupIds).filter(
      (id) => !initialAssignedIds.has(id),
    );
  }, [selectedGroupIds, initialAssignedIds]);

  const removedGroups = useMemo(() => {
    return Array.from(initialAssignedIds).filter(
      (id) => !selectedGroupIds.has(id),
    );
  }, [initialAssignedIds, selectedGroupIds]);

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all permission groups with assigned status
  const { data, isLoading } = useQuery({
    queryKey: ['allPermissionGroupsWithStatus', roleId],
    queryFn: async () => {
      return allPermissionGroupsWithStatusLoader(roleId);
    },
  });

  const allPermissionGroups = useMemo(
    () => data?.permissionGroups || [],
    [data],
  );

  const handlePermissionGroupToggle = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handleSaveChanges = useCallback(async () => {
    const toAdd: string[] = [];
    const toRemove: string[] = [];

    // Check which groups to add (selected but not initially assigned)
    selectedGroupIds.forEach((id) => {
      if (!initialAssignedIds.has(id)) {
        toAdd.push(id);
      }
    });

    // Check which groups to remove (initially assigned but not selected)
    initialAssignedIds.forEach((id) => {
      if (!selectedGroupIds.has(id)) {
        toRemove.push(id);
      }
    });

    // Only make API call if there are changes
    if (toAdd.length > 0 || toRemove.length > 0) {
      fetcher.submit(
        {
          intent: 'set-permission-groups',
          data: JSON.stringify({ toAdd, toRemove }),
        },
        {
          method: 'POST',
        },
      );
    } else {
      toast.info('No permission group changes to save');
    }

    setOpen(false);
  }, [fetcher, initialAssignedIds, selectedGroupIds, setOpen]);

  // Filter permission groups based on search term
  const filteredPermissionGroups = useMemo(
    () =>
      (searchTerm
        ? allPermissionGroups.filter(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.description &&
                p.description.toLowerCase().includes(searchTerm.toLowerCase())),
          )
        : allPermissionGroups
      ).sort((a, b) => {
        if (a.isAssigned && !b.isAssigned) {
          return -1;
        }

        if (!a.isAssigned && b.isAssigned) {
          return 1;
        }

        return a.name.localeCompare(b.name);
      }),
    [allPermissionGroups, searchTerm],
  );

  useEffectEvent(() => {
    // Initialize selected permission groups when data loads
    if (data?.permissionGroups && initialAssignedIds.size === 0) {
      const assigned = new Set<string>();

      data.permissionGroups.forEach((group) => {
        if (group.isAssigned) {
          assigned.add(group.id);
        }
      });

      setInitialAssignedIds(assigned);
      setSelectedGroupIds(new Set(assigned));
    }
  });

  const getPermissionGroupName = useCallback(
    (groupId: string) => {
      return allPermissionGroups.find((p) => p.id === groupId)?.name;
    },
    [allPermissionGroups],
  );

  return (
    <>
      <div className="py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

          <Input
            placeholder={t('settings:permissions.searchPermissionGroups')}
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
                  <Trans i18nKey="settings:permissions.loadingPermissionGroups" />
                </span>
              </div>
            }
          >
            <If
              condition={filteredPermissionGroups.length > 0}
              fallback={
                <div className="py-8 text-center">
                  <span className="text-muted-foreground text-sm">
                    {searchTerm
                      ? t(
                          'settings:permissions.noMatchingPermissionGroupsFound',
                        )
                      : t('settings:permissions.noPermissionGroupsAvailable')}
                  </span>
                </div>
              }
            >
              <div className="space-y-2 p-2">
                {filteredPermissionGroups.map((group) => (
                  <label
                    key={group.id}
                    className={cn(
                      `hover:bg-muted flex cursor-pointer items-start space-x-4 rounded-md p-2.5`,
                      {
                        'bg-muted/50':
                          group.isAssigned || selectedGroupIds.has(group.id),
                      },
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      id={group.id}
                      checked={selectedGroupIds.has(group.id)}
                      onCheckedChange={() =>
                        handlePermissionGroupToggle(group.id)
                      }
                    />

                    <span className="grid w-full gap-0.5">
                      <span className="flex w-full cursor-pointer items-center justify-between text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <span className="flex flex-col">
                          <span>{group.name}</span>

                          <If condition={group.description}>
                            <span className="text-muted-foreground text-xs">
                              {group.description}
                            </span>
                          </If>
                        </span>

                        <If
                          condition={
                            group.isAssigned &&
                            !removedGroups.includes(group.id)
                          }
                        >
                          <Badge variant="outline" className="ml-4 text-xs">
                            <CheckIcon className="mr-2 h-3 w-3" />
                            <Trans i18nKey="settings:permissions.assigned" />
                          </Badge>
                        </If>

                        <If condition={removedGroups.includes(group.id)}>
                          <Badge variant="outline" className="ml-4 text-xs">
                            <MinusIcon className="mr-2 h-3 w-3" />
                            <Trans i18nKey="settings:permissions.removing" />
                          </Badge>
                        </If>

                        <If condition={addedGroups.includes(group.id)}>
                          <Badge variant="outline" className="ml-4 text-xs">
                            <PlusIcon className="mr-2 h-3 w-3" />
                            <Trans i18nKey="settings:permissions.assigning" />
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
          <If condition={addedGroups.length > 0}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                <Trans i18nKey="settings:permissions.addedPermissionGroups" />
              </span>

              <div className="flex flex-wrap gap-2">
                {addedGroups.map((groupId) => (
                  <Badge variant={'secondary'} key={groupId}>
                    {getPermissionGroupName(groupId)}
                  </Badge>
                ))}
              </div>
            </div>
          </If>

          <If condition={removedGroups.length > 0}>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                <Trans i18nKey="settings:permissions.removedPermissionGroups" />
              </span>

              <div className="flex flex-wrap gap-2">
                {removedGroups.map((groupId) => (
                  <Badge variant={'secondary'} key={groupId}>
                    {getPermissionGroupName(groupId)}
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
          type="button"
          disabled={
            (addedGroups.length === 0 && removedGroups.length === 0) ||
            isSubmitting
          }
          onClick={handleSaveChanges}
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
