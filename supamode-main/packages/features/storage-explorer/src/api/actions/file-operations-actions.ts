import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type {
  CreateFolderRoute,
  DeleteFileRoute,
  DownloadFileRoute,
  RenameFileRoute,
} from '../routes';

/**
 * Rename a file action
 * @param params - The parameters for the action
 * @returns The response from the server
 */
export async function renameFileAction(params: {
  bucket: string;
  fromPath: string;
  toPath: string;
}) {
  const client = createHonoClient<RenameFileRoute>();

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'rename'
  ].$put({
    param: { bucket: params.bucket },
    json: {
      fromPath: params.fromPath,
      toPath: params.toPath,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Delete file action
 * @param params - The parameters for the action
 * @returns The response from the server
 */
export async function deleteFileAction(params: {
  bucket: string;
  paths: string[];
}) {
  const client = createHonoClient<DeleteFileRoute>();

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'delete'
  ].$delete({
    param: { bucket: params.bucket },
    json: {
      paths: params.paths,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Get download URL action
 * @param params - The parameters for the action
 * @returns The download URL
 */
export async function getDownloadUrlAction(params: {
  bucket: string;
  path: string;
}) {
  const client = createHonoClient<DownloadFileRoute>();

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'download'
  ].$post({
    param: { bucket: params.bucket },
    json: {
      path: params.path,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * Create folder action
 * @param params - The parameters for the action
 * @returns The response from the server
 */
export async function createFolderAction(params: {
  bucket: string;
  folderName: string;
  parentPath?: string;
}) {
  const client = createHonoClient<CreateFolderRoute>();

  const response = await client['v1']['storage']['buckets'][':bucket'][
    'create-folder'
  ].$post({
    param: { bucket: params.bucket },
    json: {
      folderName: params.folderName,
      parentPath: params.parentPath,
    },
  });

  return handleHonoClientResponse(response);
}
