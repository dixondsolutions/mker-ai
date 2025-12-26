import { useCallback, useState } from 'react';

import { useFetcher } from 'react-router';

import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Trans } from '@kit/ui/trans';

interface DeleteFileDialogProps extends React.PropsWithChildren {
  fileName: string;
  type: 'file' | 'folder';
}

export function DeleteFileDialog({
  fileName,
  type,
  children,
}: DeleteFileDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  const handleDelete = useCallback(() => {
    return fetcher.submit(
      {
        intent: 'delete-file',
        data: { fileName },
      },
      { method: 'POST', encType: 'application/json' },
    );
  }, [fetcher, fileName]);

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
              i18nKey="storageExplorer:deleteDialogTitle"
              values={{
                type: t(`storageExplorer:${type}`),
              }}
            />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="storageExplorer:deleteDialogDescription"
              values={{ fileName }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            <Trans i18nKey="storageExplorer:cancelButton" />
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={isSubmitting}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trans i18nKey="storageExplorer:deleteButton" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
