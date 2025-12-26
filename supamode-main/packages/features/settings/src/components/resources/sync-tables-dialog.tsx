import { useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCwIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form as FormProvider,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { SyncTablesSchema, SyncTablesSchemaType } from '../../api/schemas';

export function SyncTablesDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="sync-tables-button">
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          <Trans i18nKey="settings:table.syncTables" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:table.syncTables" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:table.syncTablesDescription" />
          </DialogDescription>
        </DialogHeader>

        <SyncManagedTablesForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SyncManagedTablesForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm({
    resolver: zodResolver(SyncTablesSchema),
    defaultValues: {
      schema: '',
      table: '',
    },
  });

  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess();
    }
  }, [fetcher.data?.success, onSuccess]);

  function handleSubmit(data: SyncTablesSchemaType) {
    // Remove empty table field if not provided
    const payload = {
      ...data,
      table: data.table?.trim(),
    };

    fetcher.submit(
      JSON.stringify({
        intent: 'sync-managed-tables',
        ...payload,
      }),
      {
        method: 'POST',
        encType: 'application/json',
      },
    );
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col space-y-4"
        data-testid="sync-tables-form"
      >
        <FormField
          control={form.control}
          name="schema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:schemaName" />
              </FormLabel>

              <FormControl>
                <Input
                  {...field}
                  placeholder="public"
                  data-testid="sync-tables-schema-input"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:schemaNameDescription" />
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="table"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:tableName" /> (Optional)
              </FormLabel>

              <FormControl>
                <Input
                  placeholder="users"
                  data-testid="sync-tables-table-input"
                  {...field}
                  value={(field.value as string) || ''}
                />
              </FormControl>

              <FormDescription>
                Leave empty to sync all tables in the schema. Specify a table
                name to sync only that table.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>

          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="sync-tables-submit"
          >
            {isSubmitting ? (
              <Trans i18nKey="settings:table.syncingTables" />
            ) : (
              <Trans i18nKey="settings:table.syncTables" />
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
