import { useEffect, useState } from 'react';

import { useFetcher, useNavigate } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircleIcon, TrashIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { useRolesForSharingQuery } from '@kit/permissions/hooks';
import { Button } from '@kit/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import { CreateDashboardSchema } from '../../api/schemas';

export function CreateDashboardDialog({ children }: React.PropsWithChildren) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent
        className="max-w-2xl"
        data-testid="create-dashboard-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="dashboard:actions.createDashboard" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="dashboard:messages.createNewDashboardDescription" />
          </DialogDescription>
        </DialogHeader>

        <CreateDashboardForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

interface CreateDashboardFormProps {
  onSuccess?: () => void;
}

function CreateDashboardForm({ onSuccess }: CreateDashboardFormProps) {
  const fetcher = useFetcher<{ success: boolean; data: { id: string } }>();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(CreateDashboardSchema),
    defaultValues: {
      name: '',
      roleShares: [],
    },
  });

  const isSubmitting = fetcher.state === 'submitting';

  // Handle successful submission
  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess?.();

      navigate(`/dashboards/${fetcher.data.data.id}`);
    }
  }, [fetcher.data, onSuccess, navigate]);

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) => {
          fetcher.submit(JSON.stringify(data), {
            method: 'POST',
            action: '/dashboards',
            encType: 'application/json',
          });
        })}
      >
        <NameField />

        <RoleSharesField />

        <ActionButtons
          isSubmitting={isSubmitting}
          onCancel={() => onSuccess?.()}
        />
      </form>
    </Form>
  );
}

function NameField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.name" />
          </FormLabel>

          <FormControl>
            <Input
              placeholder={t('dashboard:placeholders.enterDashboardName')}
              data-testid="dashboard-name-input"
              {...field}
            />
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:messages.giveYourDashboardDescriptiveName" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RoleSharesField() {
  return (
    <FormField
      name="roleShares"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-x-1">
            <span>
              <Trans i18nKey="dashboard:labels.shareWithRoles" />
            </span>
            <span className="text-muted-foreground text-xs">
              <Trans i18nKey="dashboard:labels.optional" />
            </span>
          </FormLabel>

          <RoleSharesSelector
            value={field.value || []}
            onChange={field.onChange}
          />

          <FormDescription>
            <Trans i18nKey="dashboard:messages.shareDashboardWithRoles" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RoleSharesSelector(props: {
  value: { roleId: string; permissionLevel: 'view' | 'edit' }[];
  onChange: (
    value: { roleId: string; permissionLevel: 'view' | 'edit' }[],
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const { data: rolesData, isLoading, isError } = useRolesForSharingQuery();

  const selectedRoleIds = props.value.map((share) => share.roleId);

  const addRole = (roleId: string) => {
    const newShare = { roleId, permissionLevel: 'view' as const };
    props.onChange([...props.value, newShare]);
  };

  const removeRole = (roleId: string) => {
    props.onChange(props.value.filter((share) => share.roleId !== roleId));
  };

  const updatePermission = (
    roleId: string,
    permissionLevel: 'view' | 'edit',
  ) => {
    props.onChange(
      props.value.map((share) =>
        share.roleId === roleId ? { ...share, permissionLevel } : share,
      ),
    );
  };

  return (
    <div className="space-y-3">
      {/* Selected Roles */}
      <If condition={props.value.length > 0}>
        <div className="space-y-2">
          {props.value.map((share) => {
            const role = rolesData?.roles?.find((r) => r.id === share.roleId);
            return (
              <div
                key={share.roleId}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <span className="flex-grow text-sm font-medium">
                  {role?.name || (
                    <Trans i18nKey="dashboard:roles.unknownRole" />
                  )}
                </span>

                <Select
                  value={share.permissionLevel}
                  onValueChange={(value: 'view' | 'edit') =>
                    updatePermission(share.roleId, value)
                  }
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <Trans i18nKey="dashboard:permissions.view" />
                    </SelectItem>
                    <SelectItem value="edit">
                      <Trans i18nKey="dashboard:permissions.edit" />
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeRole(share.roleId)}
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </If>

      {/* Add Role Button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <PlusCircleIcon className="h-3 w-3" />
            <span>
              <Trans i18nKey="dashboard:roles.addRole" />
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64">
          <Command>
            <CommandInput
              placeholder={t('dashboard:roles.searchRolesPlaceholder')}
            />
            <CommandList>
              <CommandEmpty>
                <Trans i18nKey="dashboard:roles.noRolesFound" />
              </CommandEmpty>
            </CommandList>

            <CommandGroup>
              {isError && (
                <CommandItem>
                  <Trans i18nKey="dashboard:roles.errorLoadingRoles" />
                </CommandItem>
              )}

              {isLoading ? (
                <CommandItem>
                  <Trans i18nKey="dashboard:roles.loadingRoles" />
                </CommandItem>
              ) : rolesData?.roles ? (
                rolesData.roles
                  .filter((role) => !selectedRoleIds.includes(role.id))
                  .map((role) => (
                    <CommandItem
                      key={role.id}
                      onSelect={() => {
                        addRole(role.id);
                        setOpen(false);
                      }}
                    >
                      <span>{role.name}</span>
                    </CommandItem>
                  ))
              ) : (
                <CommandItem>
                  <Trans i18nKey="dashboard:roles.noRolesAvailable" />
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ActionButtonsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

function ActionButtons({ isSubmitting, onCancel }: ActionButtonsProps) {
  return (
    <DialogFooter>
      <CancelButton isSubmitting={isSubmitting} onCancel={onCancel} />
      <CreateButton isSubmitting={isSubmitting} />
    </DialogFooter>
  );
}

function CreateButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      data-testid="create-dashboard-submit"
    >
      {isSubmitting ? (
        <Trans i18nKey="dashboard:actions.creating" />
      ) : (
        <Trans i18nKey="dashboard:actions.createDashboard" />
      )}
    </Button>
  );
}

interface CancelButtonProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

function CancelButton({ isSubmitting, onCancel }: CancelButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSubmitting}
      onClick={onCancel}
    >
      <Trans i18nKey="dashboard:actions.cancel" />
    </Button>
  );
}
