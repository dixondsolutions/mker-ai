import { getI18n } from 'react-i18next';
import { z } from 'zod';

import { createAction } from '@kit/shared/router-query-bridge';
import { toast } from '@kit/ui/sonner';

import {
  sanitizeDownloadFilename,
  validateFileName,
} from '../../utils/path-security';
import { storageExplorerQueryKeys } from '../loaders/bridge-loaders';
import {
  createFolderAction,
  deleteFileAction,
  getDownloadUrlAction,
  renameFileAction,
} from './file-operations-actions';

const BucketParamsSchema = z.object({
  bucket: z.string().min(1),
});

/**
 * Bridge-powered action for bucket operations
 * Handles all file operations with smart cache invalidation
 */
export const bucketOperationsBridgeAction = createAction({
  mutationFn: async ({ request, params }) => {
    const json = await request.json();
    const t = getI18n().t;

    const { intent, data } = json;
    const { bucket } = BucketParamsSchema.parse(params);
    const currentPath = (params['*'] as string) || '';

    switch (intent) {
      case 'rename-file': {
        const { fileName, newName } = data;

        // SECURITY: Validate file names
        validateFileName(fileName);
        validateFileName(newName);

        const fromPath = currentPath ? `${currentPath}/${fileName}` : fileName;
        const toPath = currentPath ? `${currentPath}/${newName}` : newName;

        const promise = renameFileAction({
          bucket,
          fromPath,
          toPath,
        });

        return toast
          .promise(promise, {
            loading: t('storageExplorer:renaming'),
            success: t('storageExplorer:renamed', { name: newName }),
            error: (error) => {
              if (error.message.includes('Access denied')) {
                return t('storageExplorer:accessDenied');
              }

              return error.message || t('storageExplorer:renameFailed');
            },
          })
          .unwrap();
      }

      case 'delete-file': {
        const { fileName, isBatch } = data;

        // Handle batch deletion
        if (isBatch && Array.isArray(fileName)) {
          // SECURITY: Validate file names in batch
          fileName.forEach((name: string) => validateFileName(name));

          const filePaths = fileName.map((name: string) =>
            currentPath ? `${currentPath}/${name}` : name,
          );

          const promise = deleteFileAction({
            bucket,
            paths: filePaths,
          });

          return toast
            .promise(promise, {
              loading: t('storageExplorer:batchDeleting', {
                count: fileName.length,
              }),
              success: t('storageExplorer:batchDeleteSuccess', {
                count: fileName.length,
              }),
              error: (error) => {
                if (error.message.includes('Access denied')) {
                  return t('storageExplorer:accessDenied');
                }

                return error.message || t('storageExplorer:batchDeleteFailed');
              },
            })
            .unwrap();
        }

        // Handle single file deletion
        // SECURITY: Validate single file name
        validateFileName(fileName);

        const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;

        const promise = deleteFileAction({
          bucket,
          paths: [filePath],
        });

        return toast
          .promise(promise, {
            loading: t('storageExplorer:deleting'),
            success: t('storageExplorer:deleted', { name: fileName }),
            error: (error) => {
              if (error.message.includes('Access denied')) {
                return t('storageExplorer:accessDenied');
              }

              return error.message || t('storageExplorer:deleteFailed');
            },
          })
          .unwrap();
      }

      case 'download-file': {
        const { fileName, isBatch } = data;

        const delay = (milliseconds: number) =>
          new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
          });

        const onDownload = async (
          results: Array<{ downloadUrl: string }>,
          fileNames: string | string[],
        ) => {
          const names = Array.isArray(fileNames) ? fileNames : [fileNames];

          const promises = results.map((result, index) => {
            return new Promise((resolve) => {
              setTimeout(async () => {
                const link = document.createElement('a');

                link.href = result.downloadUrl;
                // SECURITY: Sanitize filename for download
                link.download = sanitizeDownloadFilename(names[index]!);
                link.target = '_blank';
                link.style.display = 'none';

                document.body.appendChild(link);
                link.click();

                await delay(500);

                link.remove();

                resolve(result);

                return;
              }, 1000);
            });
          });

          return Promise.all(promises);
        };

        if (isBatch && Array.isArray(fileName)) {
          // SECURITY: Validate file names in batch download
          fileName.forEach((name: string) => validateFileName(name));

          const filePaths = fileName.map((name: string) =>
            currentPath ? `${currentPath}/${name}` : name,
          );

          const promises = await Promise.all(
            filePaths.map((filePath) =>
              getDownloadUrlAction({
                bucket,
                path: filePath,
              }),
            ),
          );

          const promise = onDownload(promises, fileName);

          return toast
            .promise(promise, {
              loading: t('storageExplorer:batchDownloading', {
                count: fileName.length,
              }),
              success: t('storageExplorer:batchDownloadSuccess', {
                count: fileName.length,
              }),
              error: (error) => {
                if (error.message.includes('Access denied')) {
                  return t('storageExplorer:accessDenied');
                }

                return (
                  error.message || t('storageExplorer:batchDownloadFailed')
                );
              },
            })
            .unwrap();
        }

        // SECURITY: Validate single file name for download
        validateFileName(fileName);

        const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;

        const promise = getDownloadUrlAction({
          bucket,
          path: filePath,
        }).then((result) => {
          onDownload([result], fileName);

          return result;
        });

        return toast
          .promise(promise, {
            loading: t('storageExplorer:downloading'),
            success: t('storageExplorer:downloadStarted', { name: fileName }),
            error: (error) => {
              if (error.message.includes('Access denied')) {
                return t('storageExplorer:accessDenied');
              }

              return error.message || t('storageExplorer:downloadFailed');
            },
          })
          .unwrap();
      }

      case 'get-url': {
        const { url } = data;

        try {
          await navigator.clipboard.writeText(url);
          toast.success(t('storageExplorer:urlCopied'));
        } catch (error) {
          console.error(error);

          toast.error(t('storageExplorer:urlCopyFailed'));
        }

        return null;
      }

      case 'create-folder': {
        const { folderName } = data;

        // SECURITY: Validate folder name
        validateFileName(folderName);

        const promise = createFolderAction({
          bucket,
          folderName,
          parentPath: currentPath || undefined,
        });

        return toast
          .promise(promise, {
            loading: t('storageExplorer:creatingFolder'),
            success: t('storageExplorer:folderCreated', { name: folderName }),
            error: (error) => {
              if (error.message.includes('Access denied')) {
                return t('storageExplorer:accessDenied');
              }

              if (error.message.includes('already exists')) {
                return t('storageExplorer:folderAlreadyExists', {
                  name: folderName,
                });
              }

              return error.message || t('storageExplorer:createFolderFailed');
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Unknown intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { bucket } = BucketParamsSchema.parse(params);
    const currentPath = (params['*'] as string) || '';

    return [
      // Invalidate bucket contents for the current path
      storageExplorerQueryKeys.bucketContents(bucket, currentPath || undefined),
      // Invalidate all bucket contents for this bucket (in case of folder operations)
      storageExplorerQueryKeys.bucketContents(bucket),
      // Invalidate parent directory if we're in a subdirectory
      ...(currentPath
        ? [
            storageExplorerQueryKeys.bucketContents(
              bucket,
              currentPath.split('/').slice(0, -1).join('/') || undefined,
            ),
          ]
        : []),
    ];
  },
});
