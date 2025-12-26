import { useCallback, useState } from 'react';

import { useFetcher } from 'react-router';

import { TrashIcon } from 'lucide-react';

import { BatchSelection } from '@kit/shared/hooks';
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
import { Trans } from '@kit/ui/trans';

function getRecordDisplayValue(record: Record<string, unknown>): string {
  // Try common display fields in order of preference
  const displayFields = ['name', 'title', 'email', 'username', 'id'];

  for (const field of displayFields) {
    const value = record[field];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Fallback to first non-null string value
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === 'string' && value.trim()) {
      return `${key}: ${value.trim()}`;
    }
  }

  // Last resort: show record ID or stringified partial record
  const id = record['id'] || record['_id'] || record['pk'];
  if (id) {
    return `ID: ${id}`;
  }

  // Show first few fields as fallback
  const firstFewFields = Object.entries(record)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return firstFewFields || 'Record';
}

/**
 * Batch selection actions
 * @param props - The props for the batch selection actions
 * @returns The batch selection actions
 */
export function BatchSelectionActions(props: {
  batchSelection: BatchSelection<Record<string, unknown>>;
  onClearSelection: () => void;
}) {
  return (
    <div className="flex space-x-2">
      <BatchDeleteItemsAlertDialog
        selectedItems={props.batchSelection.selectedIds}
        selectedRecords={props.batchSelection.getSelectedRecords()}
        onDelete={props.onClearSelection}
      >
        <Button
          variant="outline"
          size="sm"
          className="border-destructive m-0 h-6 gap-x-1 px-2 py-0 shadow-none"
        >
          <TrashIcon className="text-destructive mr-1 h-3 w-3" />

          <Trans
            i18nKey="common:deleteItems"
            values={{ count: props.batchSelection.selectedCount }}
          />
        </Button>
      </BatchDeleteItemsAlertDialog>
    </div>
  );
}

/**
 * Batch delete items alert dialog
 * @param props - The props for the batch delete items alert dialog
 * @returns The batch delete items alert dialog
 */
export function BatchDeleteItemsAlertDialog(props: {
  children: React.ReactNode;
  selectedItems: Set<string>;
  selectedRecords: Record<string, unknown>[];
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const isSubmitting = fetcher.state === 'submitting';
  const onDeleteCallback = props.onDelete;

  const onDelete = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    if (props.selectedItems.size === 0) {
      return;
    }

    return fetcher.submit(
      JSON.stringify({
        intent: 'delete-items',
        payload: {
          items: Array.from(props.selectedItems).map((item) =>
            JSON.parse(item),
          ),
        },
      }),
      {
        method: 'POST',
        encType: 'application/json',
      },
    );
  }, [fetcher, props.selectedItems, isSubmitting]);

  if (fetcher.data?.success) {
    setOpen(false);
    onDeleteCallback();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{props.children}</AlertDialogTrigger>

      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="common:deleteItems" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="dataExplorer:deleteItemsDescription" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-y-2">
          <div className="text-destructive flex flex-col gap-y-1 text-sm">
            <Trans
              i18nKey="dataExplorer:deleteItemsDescriptionWithCount"
              values={{ count: props.selectedItems.size }}
            />
          </div>

          <div className="py-4">
            <p className="mb-2 text-sm font-medium">
              <Trans i18nKey="dataExplorer:itemsToDelete" />
            </p>
            <div className="bg-muted max-h-32 overflow-y-auto rounded p-2">
              {props.selectedRecords.map((record, index) => (
                <div key={index} className="text-muted-foreground text-sm">
                  {getRecordDisplayValue(record)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            <Trans i18nKey="common:cancel" />
          </AlertDialogCancel>

          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Trans i18nKey="common:deleting" />
            ) : (
              <Trans i18nKey="common:deleteResource" />
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
