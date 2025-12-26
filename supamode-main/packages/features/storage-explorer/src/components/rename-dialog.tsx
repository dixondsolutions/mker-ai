import { useCallback, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

interface RenameDialogProps extends React.PropsWithChildren {
  currentName: string;
  type: 'file' | 'folder';
}

export function RenameDialog({
  currentName,
  type,
  children,
}: RenameDialogProps) {
  const [open, setOpen] = useState(false);

  const { t } = useTranslation('storageExplorer');
  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  const formId = 'rename-storage-item-form';

  const handleRename = useCallback(
    ({ newName }: { newName: string }) => {
      if (newName === currentName) {
        return;
      }

      return fetcher.submit(
        {
          intent: 'rename-file',
          data: { fileName: currentName, newName },
        },
        { method: 'POST', encType: 'application/json' },
      );
    },
    [fetcher, currentName],
  );

  if (fetcher.data?.success) {
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans
              i18nKey="storageExplorer:renameDialogTitle"
              values={{
                type: t(`storageExplorer:${type}`),
              }}
            />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="storageExplorer:renameDialogDescription"
              values={{
                type: t(`storageExplorer:${type}`),
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <RenameForm
          formId={formId}
          currentName={currentName}
          type={type}
          isSubmitting={isSubmitting}
          onSubmit={handleRename}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RenameForm({
  currentName,
  type,
  onSubmit,
  formId,
  isSubmitting,
}: {
  formId: string;
  currentName: string;
  type: 'file' | 'folder';
  onSubmit: (data: { newName: string }) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation('storageExplorer');

  const form = useForm({
    resolver: zodResolver(
      z.object({
        newName: z
          .string()
          .min(1)
          .transform((val) => val.trim()),
      }),
    ),
    defaultValues: {
      newName: currentName,
    },
  });

  return (
    <>
      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="newName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="storageExplorer:nameLabel" />
                </FormLabel>

                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('namePlaceholder', { type: t(type) })}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSubmitting}>
          <Trans i18nKey="storageExplorer:cancelButton" />
        </AlertDialogCancel>

        <Button
          form={formId}
          disabled={isSubmitting || !form.formState.isDirty}
        >
          <Trans i18nKey="storageExplorer:renameButton" />
        </Button>
      </AlertDialogFooter>
    </>
  );
}
