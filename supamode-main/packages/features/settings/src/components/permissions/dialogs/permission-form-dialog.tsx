import { useCallback, useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getI18n } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { permissionsInSupamode } from '@kit/supabase/schema';
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
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

// Define the system resources enum based on schema
const systemResources = [
  'account',
  'role',
  'permission',
  'log',
  'table',
  'auth_user',
] as const;

// Define protected schemas that only allow select action
const protectedSchemas = [
  'auth',
  'cron',
  'extensions',
  'information_schema',
  'net',
  'pgsodium',
  'pgsodium_masks',
  'pgbouncer',
  'pgtle',
  'realtime',
  'storage',
  'supabase_functions',
  'supabase_migrations',
  'vault',
  'graphql',
  'graphql_public',
  'pgmq_public',
  'supamode',
];

// Define the permission scopes enum based on schema
const permissionScopes = ['table', 'storage'] as const;

// Define common actions
const commonActions = ['*', 'select', 'insert', 'update', 'delete'] as const;

// Define form schema with all validations
const permissionFormSchema = z
  .object({
    name: z
      .string()
      .min(1, getI18n().t('settings:errors.nameRequired'))
      .max(100),
    description: z.string().max(500).nullish(),
    permissionType: z.enum(['system', 'data']),
    systemResource: z.enum(systemResources).nullish(),
    scope: z.enum(permissionScopes).nullish(),
    schemaName: z.string().nullish(),
    tableName: z.string().nullish(),
    action: z.string().min(1),
    metadata: z.record(z.string(), z.string()).nullish(),
  })
  .refine(
    (data) => {
      if (data.permissionType === 'system') {
        return !!data.systemResource;
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.systemResourceRequired'),
      path: ['systemResource'],
    },
  )
  .refine(
    (data) => {
      if (data.permissionType === 'data') {
        return !!data.scope;
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.scopeRequired'),
      path: ['scope'],
    },
  )
  .refine(
    (data) => {
      if (data.scope === 'table') {
        return !!data.schemaName;
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.schemaNameRequired'),
      path: ['schemaName'],
    },
  )
  .refine(
    (data) => {
      if (data.scope === 'table') {
        return !!data.tableName;
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.tableNameRequired'),
      path: ['tableName'],
    },
  )
  .refine(
    (data) => {
      if (data.scope === 'storage') {
        const bucketName = data.metadata?.['bucket_name'];
        const pathPattern = data.metadata?.['path_pattern'];

        return !!bucketName && !!pathPattern;
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.storageMetadataRequired'),
      path: ['metadata'],
    },
  )
  .refine(
    (data) => {
      // If schema is protected, only allow select action
      if (
        data.schemaName &&
        protectedSchemas.includes(data.schemaName as string)
      ) {
        return data.action === 'select';
      }

      return true;
    },
    {
      message: getI18n().t('settings:errors.protectedSchemaAction'),
      path: ['action'],
    },
  );

type PermissionFormValues = z.infer<typeof permissionFormSchema>;
type Permission = typeof permissionsInSupamode.$inferSelect;

interface PermissionFormDialogProps {
  children: React.ReactNode;
  mode: 'create' | 'edit';
  permission?: Permission;
  onSuccess: (permissionId: string) => void;
}

export function PermissionFormDialog({
  children,
  mode,
  permission,
  onSuccess,
}: PermissionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      trigger={children}
      title={
        mode === 'create'
          ? t('settings:permissions.create')
          : t('settings:permissions.edit')
      }
      description={
        mode === 'create'
          ? t('settings:permissions.createDescription')
          : t('settings:permissions.editDescription')
      }
      className="sm:max-w-[550px]"
      closeOnOverlayClick={false}
    >
      <PermissionFormDialogForm
        mode={mode}
        permission={permission}
        onSuccess={onSuccess}
        setOpen={setOpen}
      />
    </FormDialog>
  );
}

function PermissionFormDialogForm({
  mode,
  permission,
  onSuccess,
  setOpen,
}: {
  mode: 'create' | 'edit';
  permission?: Permission;
  onSuccess: (permissionId: string) => void;
  setOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    data: Permission;
    success: boolean;
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  // Set default values based on mode
  const defaultValues: PermissionFormValues =
    mode === 'edit' && permission
      ? {
          name: permission.name,
          description: permission.description || '',
          permissionType: permission.permissionType as 'system' | 'data',
          systemResource: permission.systemResource as
            | (typeof systemResources)[number]
            | undefined,
          scope: permission.scope as
            | (typeof permissionScopes)[number]
            | undefined,
          schemaName: permission.schemaName || '',
          tableName: permission.tableName || '',
          action: permission.action,
          metadata: (permission.metadata || {}) as Record<string, string>,
        }
      : {
          name: '',
          description: '',
          permissionType: 'system',
          action: '*',
        };

  // Initialize form with appropriate values
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues,
  });

  // Get current form values to help with conditional rendering
  const permissionType = useWatch({
    control: form.control,
    name: 'permissionType',
  });

  const scope = useWatch({ control: form.control, name: 'scope' });
  const schemaName = useWatch({ control: form.control, name: 'schemaName' });

  // Check if the current schema is protected
  const isProtectedSchema = schemaName
    ? protectedSchemas.includes(schemaName)
    : false;

  useEffect(() => {
    if (isProtectedSchema) {
      // If the schema is protected, set action to 'select' and disable it
      form.setValue('action', 'select', {
        shouldValidate: true,
      });
    }
  }, [isProtectedSchema, form]);

  const onSubmit = useCallback(
    (values: PermissionFormValues) => {
      const formData = new FormData();

      // Set intent based on mode
      if (mode === 'create') {
        formData.append('intent', 'create-permission');
        formData.append('data', JSON.stringify(values));

        return fetcher.submit(formData, {
          method: 'post',
          action: '/settings/permissions', // Submit to the permissions route
        });
      } else {
        formData.append('intent', 'update-permission');

        formData.append(
          'data',
          JSON.stringify({ ...values, id: permission?.id }),
        );

        fetcher.submit(formData, {
          method: 'post',
        });
      }
    },
    [mode, fetcher, permission?.id],
  );

  const data = fetcher.data;

  useEffect(() => {
    if (data?.success) {
      onSuccess(data.data.id);
      setOpen(false);
    }
  }, [data, onSuccess, setOpen]);

  return (
    <>
      <Form {...form}>
        <form
          id="permission-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-6 overflow-y-auto border-b px-0.5 pb-4"
          data-testid="permission-form"
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
                    placeholder="Permission name"
                    {...field}
                    data-testid="permission-form-name-input"
                  />
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="settings:permissions.nameDescription" />
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
                      'settings:permissions.descriptionPlaceholder',
                    )}
                    {...field}
                    value={field.value ?? ''}
                    data-testid="permission-form-description-textarea"
                  />
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="settings:permissions.descriptionDescription" />
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="permissionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:permissions.permissionType" />
                </FormLabel>

                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger data-testid="permission-form-permission-type-select-trigger">
                      <SelectValue
                        placeholder={t(
                          'settings:permissions.permissionTypePlaceholder',
                        )}
                      />
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    <SelectItem
                      value="system"
                      data-testid="permission-form-permission-type-select-item-system"
                    >
                      <Trans i18nKey="settings:permissions.system" />
                    </SelectItem>

                    <SelectItem
                      value="data"
                      data-testid="permission-form-permission-type-select-item-data"
                    >
                      <Trans i18nKey="settings:permissions.data" />
                    </SelectItem>
                  </SelectContent>
                </Select>

                <FormDescription>
                  <Trans i18nKey="settings:permissions.permissionTypeDescription" />
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fields for system permissions */}
          <If condition={permissionType === 'system'}>
            <FormField
              control={form.control}
              name="systemResource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="settings:permissions.systemResource" />
                  </FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? ''}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="permission-form-system-resource-select-trigger">
                        <SelectValue
                          placeholder={t(
                            'settings:permissions.systemResourcePlaceholder',
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {systemResources.map((resource) => (
                        <SelectItem
                          key={resource}
                          value={resource}
                          data-testid={`permission-form-system-resource-select-item-${resource}`}
                        >
                          {getSystemResourceName(resource)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription>
                    {field.value ? (
                      <Trans
                        i18nKey={`settings:permissions.systemResourceDescription.${field.value}`}
                      />
                    ) : (
                      <Trans i18nKey="settings:permissions.systemResourceDescription.default" />
                    )}
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />
          </If>

          {/* Fields for data permissions */}
          <If condition={permissionType === 'data'}>
            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="settings:permissions.scope" />
                  </FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? ''}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="permission-form-scope-select-trigger">
                        <SelectValue
                          placeholder={t(
                            'settings:permissions.scopePlaceholder',
                          )}
                        />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      {permissionScopes.map((scopeOption) => (
                        <SelectItem
                          key={scopeOption}
                          value={scopeOption}
                          data-testid={`permission-form-scope-select-item-${scopeOption}`}
                        >
                          {getScopeName(scopeOption)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormDescription>
                    <Trans i18nKey="settings:permissions.scopeDescription" />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <If condition={scope === 'storage'}>
              <FormField
                control={form.control}
                name="metadata.bucket_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:permissions.storageBucket" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t(
                          'settings:permissions.storageBucketPlaceholder',
                        )}
                        {...field}
                        value={field.value ?? ''}
                        data-testid="permission-form-storage-bucket-name-input"
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:permissions.storageBucketDescription" />
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.path_pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:permissions.storagePathPattern" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t(
                          'settings:permissions.storagePathPatternPlaceholder',
                        )}
                        {...field}
                        value={field.value ?? ''}
                        data-testid="permission-form-storage-path-input"
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:permissions.storagePathPatternDescription" />
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </If>

            {/* Schema name field - required for schema, table scopes */}
            <If condition={scope === 'table'}>
              <FormField
                control={form.control}
                name="schemaName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:permissions.schemaName" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t(
                          'settings:permissions.schemaNamePlaceholder',
                        )}
                        {...field}
                        value={field.value ?? ''}
                        data-testid="permission-form-schema-name-input"
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:permissions.schemaNameDescription" />
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </If>

            {/* Table name field - required for table scopes */}
            <If condition={scope === 'table'}>
              <FormField
                control={form.control}
                name="tableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:permissions.tableName" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t(
                          'settings:permissions.tableNamePlaceholder',
                        )}
                        {...field}
                        value={field.value ?? ''}
                        data-testid="permission-form-table-name-input"
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:permissions.tableNameDescription" />
                    </FormDescription>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </If>
          </If>

          {/* Action field - required for all permission types */}
          <FormField
            control={form.control}
            name="action"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:permissions.action" />
                </FormLabel>

                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isProtectedSchema}
                >
                  <FormControl>
                    <SelectTrigger data-testid="permission-form-action-select-trigger">
                      {isProtectedSchema ? (
                        <Trans
                          i18nKey={
                            'settings:permissions.protectedSchemaActionDescription'
                          }
                        />
                      ) : (
                        <SelectValue
                          placeholder={t(
                            'settings:permissions.actionPlaceholder',
                          )}
                        />
                      )}
                    </SelectTrigger>
                  </FormControl>

                  <SelectContent>
                    {isProtectedSchema ? (
                      <SelectItem
                        value="select"
                        data-value="select"
                        data-testid="permission-form-action-select-item"
                      >
                        {getActionName('select')}
                      </SelectItem>
                    ) : (
                      commonActions.map((action) => (
                        <SelectItem
                          key={action}
                          value={action}
                          data-value={action}
                          data-testid={`permission-form-action-select-item`}
                        >
                          {getActionName(action)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <FormDescription>
                  <Trans i18nKey="settings:permissions.actionDescription" />
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <FormFooter
        onCancel={() => setOpen(false)}
        cancelLabel={<Trans i18nKey="common:cancel" />}
        isSubmitting={isSubmitting}
        disabled={!form.formState.isDirty}
        submitButton={
          <FormFooter.SubmitButton
            form="permission-form"
            disabled={isSubmitting || !form.formState.isDirty}
          >
            {isSubmitting ? (
              <Trans i18nKey="common:saving" />
            ) : mode === 'create' ? (
              t('settings:permissions.create')
            ) : (
              t('settings:permissions.save')
            )}
          </FormFooter.SubmitButton>
        }
      />
    </>
  );
}

function getSystemResourceName(resource: string) {
  switch (resource) {
    case 'account':
      return <Trans i18nKey="settings:permissions.systemResourceAccount" />;
    case 'role':
      return <Trans i18nKey="settings:permissions.systemResourceRole" />;
    case 'permission':
      return <Trans i18nKey="settings:permissions.systemResourcePermission" />;
    case 'system_setting':
      return (
        <Trans i18nKey="settings:permissions.systemResourceSystemSetting" />
      );
    case 'log':
      return <Trans i18nKey="settings:permissions.systemResourceLog" />;
    case 'table':
      return <Trans i18nKey="settings:permissions.systemResourceTable" />;
    case 'auth_user':
      return <Trans i18nKey="settings:permissions.systemResourceAuthUser" />;
    default:
      return resource;
  }
}

/**
 * Get the name of the scope
 * @param scope - The scope to get the name of
 * @returns The name of the scope
 */
function getScopeName(scope: string) {
  switch (scope) {
    case 'table':
      return <Trans i18nKey="settings:permissions.scopeTable" />;

    case 'storage':
      return <Trans i18nKey="settings:permissions.scopeStorage" />;

    default:
      return scope;
  }
}

/**
 * Get the name of the action
 * @param action - The action to get the name of
 * @returns The name of the action
 */
function getActionName(action: string) {
  switch (action) {
    case '*':
      return <Trans i18nKey="settings:permissions.actionAll" />;

    case 'select':
      return <Trans i18nKey="settings:permissions.actionSelect" />;

    case 'insert':
      return <Trans i18nKey="settings:permissions.actionInsert" />;

    case 'update':
      return <Trans i18nKey="settings:permissions.actionUpdate" />;

    case 'delete':
      return <Trans i18nKey="settings:permissions.actionDelete" />;

    default:
      return action;
  }
}
