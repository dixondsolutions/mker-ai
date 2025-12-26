import { useCallback, useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getI18n } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { permissionGroupsInSupamode } from '@kit/supabase/schema';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { FormDialog } from '@kit/ui/form-dialog';
import { FormFooter } from '@kit/ui/form-footer';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

// Define form schema with validations
const permissionGroupFormSchema = z.object({
  name: z
    .string()
    .min(1, getI18n().t('settings:permissions.groupNameRequired'))
    .max(100, getI18n().t('settings:permissions.groupNameMaxLength')),
  description: z
    .string()
    .max(1000, getI18n().t('settings:permissions.groupDescriptionMaxLength'))
    .optional(),
});

type PermissionGroupFormValues = z.infer<typeof permissionGroupFormSchema>;
type PermissionGroup = typeof permissionGroupsInSupamode.$inferSelect;

interface PermissionGroupFormDialogProps {
  children: React.ReactNode;
  mode: 'create' | 'edit';
  permissionGroup?: PermissionGroup;
  onSuccess?: (permissionGroupId: string) => void;
}

export function PermissionGroupFormDialog({
  children,
  mode,
  permissionGroup,
  onSuccess,
}: PermissionGroupFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={
        mode === 'create' ? (
          <Trans i18nKey="settings:permissions.createGroup" />
        ) : (
          <Trans i18nKey="settings:permissions.editGroup" />
        )
      }
      description={
        mode === 'create' ? (
          <Trans i18nKey="settings:permissions.createGroupDescription" />
        ) : (
          <Trans i18nKey="settings:permissions.editGroupDescription" />
        )
      }
      className="sm:max-w-[550px]"
    >
      <PermissionGroupForm
        mode={mode}
        permissionGroup={permissionGroup}
        onSuccess={onSuccess}
        setOpen={setOpen}
      />
    </FormDialog>
  );
}

function PermissionGroupForm(props: {
  mode: 'create' | 'edit';
  permissionGroup?: PermissionGroup;
  onSuccess?: (permissionGroupId: string) => void;
  setOpen: (open: boolean) => void;
}) {
  const { mode, permissionGroup, onSuccess, setOpen } = props;

  const { t } = useTranslation();

  const fetcher = useFetcher<{
    data: PermissionGroup;
    success: boolean;
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  // Set default values based on mode
  const defaultValues: PermissionGroupFormValues =
    mode === 'edit' && permissionGroup
      ? {
          name: permissionGroup.name,
          description: permissionGroup.description || '',
        }
      : {
          name: '',
          description: '',
        };

  // Initialize form with appropriate values
  const form = useForm<PermissionGroupFormValues>({
    resolver: zodResolver(permissionGroupFormSchema),
    defaultValues,
  });

  // Handle successful operations
  useEffect(() => {
    if (fetcher.data?.data) {
      onSuccess?.(fetcher.data.data.id);
      setOpen(false);
    }
  }, [fetcher.data?.data, onSuccess, setOpen]);

  // Handle form submission
  const onSubmit = useCallback(
    (values: PermissionGroupFormValues) => {
      const formData = new FormData();

      // Set intent based on mode
      if (mode === 'create') {
        formData.append('intent', 'create-permission-group');
        formData.append('data', JSON.stringify(values));

        fetcher.submit(formData, {
          method: 'post',
          action: '/settings/permissions', // Submit to the permissions route with groups tab
        });
      } else {
        formData.append('intent', 'update-permission-group');

        formData.append(
          'data',
          JSON.stringify({ ...values, id: permissionGroup?.id }),
        );

        fetcher.submit(formData, {
          method: 'post',
        });
      }
    },
    [fetcher, mode, permissionGroup?.id],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        data-testid="permission-group-form"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:permissions.name" />
              </FormLabel>

              <FormControl>
                <Input
                  placeholder={t('settings:permissions.groupNamePlaceholder')}
                  {...field}
                  data-testid="permission-group-form-name-input"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:permissions.groupNameDescription" />
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:permissions.description" />
              </FormLabel>

              <FormControl>
                <Textarea
                  placeholder={t(
                    'settings:permissions.groupDescriptionPlaceholder',
                  )}
                  {...field}
                  value={field.value || ''}
                  data-testid="permission-group-form-description-textarea"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:permissions.groupDescriptionDescription" />
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormFooter
          onCancel={() => setOpen(false)}
          cancelLabel={<Trans i18nKey="common:cancel" />}
          isSubmitting={isSubmitting}
          submitButton={
            <FormFooter.SubmitButton disabled={isSubmitting}>
              {isSubmitting ? (
                <Trans i18nKey="common:saving" />
              ) : mode === 'create' ? (
                <Trans i18nKey="settings:permissions.createGroup" />
              ) : (
                <Trans i18nKey="settings:permissions.save" />
              )}
            </FormFooter.SubmitButton>
          }
        />
      </form>
    </Form>
  );
}
