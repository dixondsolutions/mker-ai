import { useCallback, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { TrashIcon } from 'lucide-react';

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
import { Trans } from '@kit/ui/trans';

import { StorageItem } from '../types';

interface BatchActionsProps {
  selectedItems: StorageItem[];
  selectedCount: number;
  onClearSelection: () => void;
}

export function BatchActions({
  selectedItems,
  selectedCount,
  onClearSelection,
}: BatchActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetcher = useFetcher();

  const deletableItems = useMemo(() => {
    return selectedItems.filter((item) => item.permissions?.canDelete);
  }, [selectedItems]);

  const handleBatchDelete = useCallback(() => {
    if (deletableItems.length === 0) {
      return;
    }

    // Delete files using the batch delete action
    fetcher.submit(
      {
        intent: 'delete-file',
        data: {
          fileName: deletableItems.map((item) => item.name),
          isBatch: true,
        },
      },
      { method: 'POST', encType: 'application/json' },
    );

    // Clear selection after submitting delete
    onClearSelection();
    setShowDeleteDialog(false);
  }, [deletableItems, fetcher, onClearSelection]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-x-2.5">
        <If condition={deletableItems.length > 0}>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={fetcher.state !== 'idle'}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="storageExplorer:batchDelete" /> ({selectedCount}
                )
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <Trans
                    i18nKey="storageExplorer:batchDeleteConfirm"
                    values={{ count: deletableItems.length }}
                  />
                </DialogTitle>

                <DialogDescription>
                  <Trans
                    i18nKey="storageExplorer:batchDeleteDescription"
                    values={{ count: deletableItems.length }}
                  />
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={fetcher.state !== 'idle'}>
                    <Trans i18nKey="storageExplorer:cancelButton" />
                  </Button>
                </DialogClose>

                <Button
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={fetcher.state !== 'idle'}
                >
                  <Trans i18nKey="storageExplorer:deleteButton" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </If>
      </div>
    </>
  );
}
