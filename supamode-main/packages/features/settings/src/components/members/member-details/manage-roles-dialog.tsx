import { useEffect, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { useQuery } from '@tanstack/react-query';
import { CheckIcon, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { rolesInSupamode } from '@kit/supabase/schema';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
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
import { Input } from '@kit/ui/input';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { permissionsLoader } from '../../../loaders';

type AssignRoleDialogProps = React.PropsWithChildren<{
  roles: Array<typeof rolesInSupamode.$inferSelect>;
}>;

export function AssignRoleDialog({ roles, children }: AssignRoleDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:member.manageRoles" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:member.manageRolesDescription" />
          </DialogDescription>
        </DialogHeader>

        <AssignRoleDialogContent roles={roles} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

function AssignRoleDialogContent({
  roles,
  setOpen,
}: {
  roles: Array<typeof rolesInSupamode.$inferSelect>;
  setOpen: (isOpen: boolean) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  const initialRoleId = useMemo(
    () => (roles.length > 0 ? roles[0]!.id : null),
    [roles],
  );

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    initialRoleId,
  );

  // Fetch all roles
  const { data, isLoading } = useFetchRoles();
  const allRoles = useMemo(() => data?.roles || [], [data]);

  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  // we want to know the current user's max role rank
  // to display a warning if the user is elevating someone's role
  // to the same rank
  const currentUserMaxRoleRank = data?.access.roleRank;

  const assignableRoles = useMemo(() => {
    return allRoles.filter(
      (role) => role.rank <= (currentUserMaxRoleRank ?? 0),
    );
  }, [allRoles, currentUserMaxRoleRank]);

  // Filter and sort roles
  const filteredRoles = useMemo(() => {
    return searchTerm
      ? assignableRoles.filter(
          (r) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.description &&
              r.description.toLowerCase().includes(searchTerm.toLowerCase())),
        )
      : assignableRoles;
  }, [assignableRoles, searchTerm]);

  const sortedRoles = useMemo(() => {
    const rolesWithAssignment = filteredRoles.map((role) => ({
      ...role,
      isAssigned: initialRoleId === role.id,
    }));

    return rolesWithAssignment.sort((a, b) => {
      // if assigned, comes first
      if (a.isAssigned && !b.isAssigned) return -1;
      if (!a.isAssigned && b.isAssigned) return 1;

      // then by rank
      return (b.rank ?? 0) - (a.rank ?? 0);
    });
  }, [filteredRoles, initialRoleId]);

  // Check if role was changed
  const roleChanged = selectedRoleId !== initialRoleId;

  useEffect(() => {
    if (fetcher.data?.success) {
      setOpen(false);
    }
  }, [fetcher.data?.success, setOpen]);

  return (
    <>
      <div className="flex flex-col gap-4 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

          <Input
            data-testid="assign-role-dialog-search-input"
            placeholder={t('settings:member.searchRoles')}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {roleChanged && selectedRoleId && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="settings:member.youWillAssignRole" />
            </p>

            <div>
              <Badge variant="secondary" className="text-xs">
                {
                  assignableRoles.find((role) => role.id === selectedRoleId)
                    ?.name
                }
              </Badge>
            </div>

            <If
              condition={
                currentUserMaxRoleRank ===
                assignableRoles.find((role) => role.id === selectedRoleId)?.rank
              }
            >
              <Alert variant="warning" data-testid="assign-role-dialog-warning">
                <AlertTitle>
                  <Trans i18nKey="settings:member.elevatingRoleToSameRank" />
                </AlertTitle>

                <AlertDescription>
                  <Trans i18nKey="settings:member.elevatingRoleToSameRankDescription" />
                </AlertDescription>
              </Alert>
            </If>
          </div>
        )}

        <div className="max-h-[50vh] overflow-auto">
          <If
            condition={!isLoading}
            fallback={
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground text-sm">
                  <Trans i18nKey="settings:member.loadingRoles" />
                </span>
              </div>
            }
          >
            <If
              condition={sortedRoles.length > 0}
              fallback={
                <div className="flex items-center justify-center py-8">
                  <span className="text-muted-foreground text-sm">
                    {searchTerm
                      ? t('settings:member.noMatchingRolesFound')
                      : t('settings:member.noRolesAvailable')}
                  </span>
                </div>
              }
            >
              <RadioGroup
                value={selectedRoleId || ''}
                onValueChange={setSelectedRoleId}
                className="space-y-0.5"
              >
                {sortedRoles.map((role) => (
                  <label
                    data-testid={`assign-role-dialog-role`}
                    data-name={role.name}
                    key={role.id}
                    className={cn(
                      `flex items-start space-x-4 rounded-md border p-2.5 transition-all`,
                      role.isAssigned && 'cursor-not-allowed opacity-50',
                      !role.isAssigned && 'hover:border-primary cursor-pointer',
                      selectedRoleId === role.id &&
                        'border-primary bg-muted/50',
                    )}
                  >
                    <RadioGroupItem
                      disabled={role.isAssigned}
                      value={role.id}
                      id={role.id}
                      className="mt-0.5"
                    />

                    <span className="grid gap-0.5">
                      <span className="cursor-pointer justify-between text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        <span
                          className="font-medium"
                          data-is-assigned={role.isAssigned}
                          data-testid="assign-role-dialog-role-name"
                        >
                          {role.name}
                        </span>
                      </span>

                      <If condition={role.description}>
                        <span className="text-muted-foreground text-xs">
                          {role.description}
                        </span>
                      </If>

                      <span className="mt-2.5 flex items-center gap-2">
                        <If condition={role.isAssigned}>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            <CheckIcon className="mr-2 h-3 w-3" />
                            {t('settings:member.currentRole')}
                          </Badge>
                        </If>

                        <If condition={role.rank !== null}>
                          <Badge variant="secondary" className="text-xs">
                            {t('settings:member.rank')}: {role.rank}
                          </Badge>
                        </If>
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </If>
          </If>
        </div>
      </div>

      <DialogFooter className="sm:justify-end">
        <DialogClose disabled={isSubmitting} asChild>
          <Button type="button" variant="secondary">
            <Trans i18nKey="common:cancel" />
          </Button>
        </DialogClose>

        <Button
          data-testid="assign-role-dialog-save-changes-button"
          type="button"
          disabled={isSubmitting || !roleChanged}
          onClick={() => {
            return fetcher.submit(
              {
                intent: 'assign-role',
                data: JSON.stringify({ roleId: selectedRoleId }),
              },
              {
                method: 'post',
              },
            );
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

function useFetchRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: permissionsLoader,
  });
}
