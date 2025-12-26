import { useCallback } from 'react';

import { useFetcher } from 'react-router';

import {
  DownloadIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { StorageItem } from '../types';
import { DeleteFileDialog } from './delete-file-dialog';
import { RenameDialog } from './rename-dialog';

interface FileContextMenuProps {
  item: StorageItem;
  bucket: string;
  currentPath: string;
}

export function FileContextMenu({ item }: FileContextMenuProps) {
  const fetcher = useFetcher();

  // Get permissions from the item or default to no permissions
  const permissions = item.permissions || {
    canRead: false,
    canUpdate: false,
    canDelete: false,
    canUpload: false,
  };

  const handleGetUrl = useCallback(() => {
    // SECURITY: Only proceed if user has read permission
    if (!permissions.canRead) {
      return;
    }

    const url = item.previewUrl || item.publicUrl;

    if (!url) {
      return;
    }

    return fetcher.submit(
      {
        intent: 'get-url',
        data: { url },
      },
      { method: 'POST', encType: 'application/json' },
    );
  }, [fetcher, item.previewUrl, item.publicUrl, permissions.canRead]);

  const handleDownload = useCallback(() => {
    if (item.isDirectory || !permissions.canRead) {
      return;
    }

    return fetcher.submit(
      {
        intent: 'download-file',
        data: { fileName: item.name },
      },
      { method: 'POST', encType: 'application/json' },
    );
  }, [fetcher, item.isDirectory, item.name, permissions.canRead]);

  // Calculate if any actions are available
  const canGetUrl =
    !item.isDirectory &&
    permissions.canRead &&
    (item.previewUrl || item.publicUrl);

  const canRename = permissions.canUpdate;
  const canDownload = !item.isDirectory && permissions.canRead;
  const canDelete = permissions.canDelete;

  // Don't show context menu if no actions are available
  const hasAnyActions = canGetUrl || canRename || canDownload || canDelete;

  if (!hasAnyActions) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-6 max-w-6 p-0"
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <If condition={canGetUrl}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();

                handleGetUrl();
              }}
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="storageExplorer:getUrlAction" />
            </DropdownMenuItem>
          </If>

          <If condition={canRename}>
            <RenameDialog
              currentName={item.name}
              type={item.isDirectory ? 'folder' : 'file'}
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="storageExplorer:renameAction" />
              </DropdownMenuItem>
            </RenameDialog>
          </If>

          <If condition={canDownload}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();

                handleDownload();
              }}
            >
              <DownloadIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="storageExplorer:downloadAction" />
            </DropdownMenuItem>
          </If>

          <If condition={canDelete && (canGetUrl || canRename || canDownload)}>
            <DropdownMenuSeparator />
          </If>

          <If condition={canDelete}>
            <DeleteFileDialog
              fileName={item.name}
              type={item.isDirectory ? 'folder' : 'file'}
            >
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="storageExplorer:deleteAction" />
              </DropdownMenuItem>
            </DeleteFileDialog>
          </If>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
