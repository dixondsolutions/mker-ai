import { useCallback, useState } from 'react';

import { useFetcher } from 'react-router';

import { FolderPlusIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { FormDialog } from '@kit/ui/form-dialog';
import { FormFooter } from '@kit/ui/form-footer';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Trans } from '@kit/ui/trans';

interface CreateFolderDialogProps {
  canCreate: boolean;
}

export function CreateFolderDialog({ canCreate }: CreateFolderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const fetcher = useFetcher();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!folderName.trim() || fetcher.state !== 'idle') {
        return;
      }

      fetcher.submit(
        {
          intent: 'create-folder',
          data: { folderName: folderName.trim() },
        },
        { method: 'POST', encType: 'application/json' },
      );

      // Reset form and close dialog
      setFolderName('');
      setIsOpen(false);
    },
    [folderName, fetcher],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit],
  );

  if (!canCreate) {
    return null;
  }

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <Button variant="outline" size="sm">
          <FolderPlusIcon className="mr-2 h-4 w-4" />
          <Trans i18nKey="storageExplorer:createFolderButton" />
        </Button>
      }
      title={<Trans i18nKey="storageExplorer:createFolderDialogTitle" />}
      description={
        <Trans i18nKey="storageExplorer:createFolderDialogDescription" />
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="my-4 grid gap-2">
          <Label htmlFor="folder-name">
            <Trans i18nKey="storageExplorer:folderNameLabel" />
          </Label>

          <Input
            id="folder-name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New Folder"
            autoFocus
            disabled={fetcher.state !== 'idle'}
          />
        </div>

        <FormFooter
          onCancel={() => setIsOpen(false)}
          submitLabel={<Trans i18nKey="storageExplorer:createFolderButton" />}
          cancelLabel={<Trans i18nKey="storageExplorer:cancelButton" />}
          isSubmitting={fetcher.state !== 'idle'}
          disabled={!folderName.trim()}
        />
      </form>
    </FormDialog>
  );
}
