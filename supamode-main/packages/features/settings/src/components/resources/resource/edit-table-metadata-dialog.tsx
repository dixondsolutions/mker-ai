import { useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getI18n, useTranslation } from 'react-i18next';
import { z } from 'zod';

import { tableMetadataInSupamode } from '@kit/supabase/schema';
import { ColumnsConfig } from '@kit/types';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Input } from '@kit/ui/input';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

type TableMetadata = typeof tableMetadataInSupamode.$inferSelect & {
  columnsConfig: ColumnsConfig;
};

export function EditTableMetadataDialog({
  table,
  defaultOpen,
  onClose,
  children,
}: React.PropsWithChildren<{
  table: TableMetadata;
  defaultOpen?: boolean | null | undefined;
  onClose?: () => void;
}>) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          // clear the search params to clear the edit=true param
          onClose?.();
        }

        setOpen(open);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="settings:table.configureTableTitle"
              values={{ name: table.tableName }}
            />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:table.configureTableDescription" />
          </DialogDescription>
        </DialogHeader>

        <EditTableMetadataForm
          table={table}
          onSuccess={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditTableMetadataForm(props: {
  table: TableMetadata;
  onSuccess: () => void;
}) {
  const form = useForm({
    reValidateMode: 'onChange',
    mode: 'onChange',
    resolver: zodResolver(
      z.object({
        tableName: z.string().min(1),
        displayName: z.string().min(0).max(255).default('').nullish(),
        description: z.string().min(0).max(500).default('').nullish(),
        isVisible: z.boolean().nullish(),
        isSearchable: z.boolean().nullish(),
        displayFormat: getDisplayFormatSchema(props.table.columnsConfig),
      }),
    ),
    defaultValues: {
      tableName: props.table.tableName,
      displayName: props.table.displayName,
      description: props.table.description,
      displayFormat: props.table.displayFormat,
      isVisible: props.table.isVisible,
      isSearchable: props.table.isSearchable,
    },
  });

  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const isSubmitting = fetcher.state === 'submitting';
  const { t } = useTranslation();
  const onSuccess = props.onSuccess;

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess();
    }
  }, [fetcher.data?.success, onSuccess]);

  return (
    <Form {...form}>
      <form
        data-testid="edit-table-metadata-form"
        className="flex flex-col space-y-4"
        onSubmit={form.handleSubmit(async (data) => {
          fetcher.submit(
            {
              intent: 'update-table-metadata',
              data: {
                name: data.tableName,
                is_visible: data.isVisible ?? true,
                is_searchable: data.isSearchable ?? true,
                display_name: data.displayName ?? '',
                description: data.description ?? '',
                display_format: data.displayFormat ?? '',
              },
            },
            {
              method: 'POST',
              encType: 'application/json',
            },
          );
        })}
      >
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:table.displayName" />
              </FormLabel>

              <FormControl>
                <Input
                  {...field}
                  placeholder={t('settings:table.displayNamePlaceholder')}
                  value={field.value ?? ''}
                  data-testid="edit-table-metadata-form-display-name"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:table.displayNameDescription" />
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
                <Trans i18nKey="settings:table.description" />
              </FormLabel>

              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  data-testid="edit-table-metadata-form-description"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:table.descriptionDescription" />
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayFormat"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:table.displayFormat" />
              </FormLabel>

              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  data-testid="edit-table-metadata-form-display-format"
                  placeholder={t('settings:table.displayFormatPlaceholder')}
                />
              </FormControl>

              <FormDescription>
                <Trans
                  i18nKey="settings:table.displayFormatDescription"
                  values={{
                    values: Object.values(props.table.columnsConfig)
                      .map((column) => column.name)
                      .join(', '),
                  }}
                />
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isVisible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>
                  <Trans i18nKey="settings:table.visible" />
                </FormLabel>

                <FormDescription>
                  <Trans i18nKey="settings:table.visibleDescription" />
                </FormDescription>
              </div>

              <FormControl>
                <Switch
                  data-testid="edit-table-metadata-form-visible"
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isSearchable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>
                  <Trans i18nKey="settings:table.isSearchable" />
                </FormLabel>

                <FormDescription>
                  <Trans i18nKey="settings:table.isSearchableDescription" />
                </FormDescription>
              </div>

              <FormControl>
                <Switch
                  data-testid="edit-table-metadata-form-searchable"
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">
              <Trans i18nKey="common:cancel" />
            </Button>
          </DialogClose>

          <Button
            type="submit"
            disabled={
              isSubmitting || !form.formState.isValid || !form.formState.isDirty
            }
          >
            {isSubmitting ? (
              <Trans i18nKey="common:saving" />
            ) : (
              <Trans i18nKey="common:save" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * Get the display format schema. This is used to validate the display format field, which is dependent on the columns in the table. We use it to ensure the user is not using fields that don't exist in the table.
 * @param columnsConfig
 * @returns
 */
function getDisplayFormatSchema(columnsConfig: ColumnsConfig) {
  return z
    .string()
    .default('')
    .nullable()
    .refine(
      (displayFormat) => {
        // the display format can only contain fields that are present in the table. Ex Order {id} - {createdAt}. We must extract the fields wrapped in {} and check if they are present in the table.
        if (displayFormat) {
          const fields = displayFormat.match(/{([^}]+)}/g) ?? [];

          const validFields = fields.every((field) => {
            // Extract the field expression without braces
            const fieldExpression = field.replace('{', '').replace('}', '');

            // Split by the OR operator and trim each field name
            const fieldNames = fieldExpression
              .split('||')
              .map((name) => name.trim());

            // Check if every field in the OR expression exists in the table
            return fieldNames.every((fieldName) =>
              Object.values(columnsConfig).some(
                (column) => column.name === fieldName,
              ),
            );
          });

          if (!validFields) {
            return false;
          }
        }

        return true;
      },
      {
        message: getI18n().t('settings:table.displayFormatInvalid'),
      },
    );
}
