import { useCallback, useState } from 'react';

import { useRevalidator } from 'react-router';

import { UploadIcon } from 'lucide-react';

import { invalidateQueries } from '@kit/shared/router-query-bridge';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { FileUploader } from '@kit/ui/file-uploader';
import { Trans } from '@kit/ui/trans';

import { storageExplorerQueryKeys } from '../api/loaders/bridge-loaders';

interface FileUploadDialogProps {
  bucket: string;
  currentPath: string;
  folderName: string;
  canUpload: boolean;
  allowedMimeTypes: string[];
  maxFileSizeMB?: number;
}

const MAX_FILE_SIZE_MB = 2;

export function FileUploadDialog({
  bucket,
  currentPath,
  folderName,
  canUpload,
  allowedMimeTypes,
  maxFileSizeMB = MAX_FILE_SIZE_MB,
}: FileUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const client = useSupabase();
  const revalidator = useRevalidator();

  const handleUploadSuccess = useCallback(() => {
    // Close the dialog
    setIsOpen(false);

    // invalidate the cache
    invalidateQueries(storageExplorerQueryKeys.bucketContents(bucket));

    revalidator.revalidate();
  }, [bucket, revalidator]);

  if (!canUpload) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <UploadIcon className="mr-2 h-4 w-4" />
          <Trans i18nKey="storageExplorer:uploadButton" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="storageExplorer:uploadDialogTitle"
              values={{ folderName }}
            />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="storageExplorer:uploadDialogDescription" />
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex max-h-[80vh] justify-center overflow-y-auto">
          <FileUploader
            className="w-full"
            maxFiles={10}
            bucketName={bucket}
            path={currentPath || undefined}
            allowedMimeTypes={allowedMimeTypes}
            maxFileSize={getMaxFileSize(maxFileSizeMB)}
            client={client}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getMaxFileSize(megaBytes: number) {
  return megaBytes * 1024 * 1024;
}
