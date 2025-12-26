import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type FileError,
  type FileRejection,
  useDropzone,
} from 'react-dropzone';

interface FileWithPreview extends File {
  preview?: string;
  errors: readonly FileError[];
}

type UseSupabaseUploadOptions = {
  /**
   * Name of bucket to upload files to in your Supabase project
   */
  bucketName: string;
  /**
   * Folder to upload files to in the specified bucket within your Supabase project.
   *
   * Defaults to uploading files to the root of the bucket
   *
   * e.g If specified path is `test`, your file will be uploaded as `test/file_name`
   */
  path?: string;
  /**
   * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
   *
   * Defaults to allowing uploading of all MIME types.
   */
  allowedMimeTypes?: string[];
  /**
   * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
   */
  maxFileSize?: number;
  /**
   * Maximum number of files allowed per upload.
   */
  maxFiles?: number;
  /**
   * The number of seconds the asset is cached in the browser and in the Supabase CDN.
   *
   * This is set in the Cache-Control: max-age=<seconds> header. Defaults to 3600 seconds.
   */
  cacheControl?: number;
  /**
   * When set to true, the file is overwritten if it exists.
   *
   * When set to false, an error is thrown if the object already exists. Defaults to `false`
   */
  upsert?: boolean;
  /**
   * When set to true, generates unique filenames using UUID prefix to prevent conflicts.
   * When set to false, uses original filename (sanitized). Defaults to `true` for safety.
   */
  useUniqueFilenames?: boolean;
  /**
   * Supabase client to use for the upload.
   */
  client: SupabaseClient;
  /**
   * Callback to call when the upload is successful.
   */
  onUploadSuccess?: (files: string[]) => void;
};

type UseSupabaseUploadReturn = ReturnType<typeof useSupabaseUpload>;

/**
 * Hook to upload files to a Supabase bucket.
 *
 * @param options - Options for the upload.
 * @returns The upload state.
 */
const useSupabaseUpload = (options: UseSupabaseUploadOptions) => {
  const {
    bucketName,
    path,
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
    cacheControl = 3600,
    upsert = false,
    useUniqueFilenames = false,
    client,
    onUploadSuccess,
  } = options;

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) {
      return false;
    }

    if (errors.length === 0 && successes.length === files.length) {
      return true;
    }

    return false;
  }, [errors.length, successes.length, files.length]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          (file as FileWithPreview).preview = URL.createObjectURL(file);
          (file as FileWithPreview).errors = [];

          return file as FileWithPreview;
        });

      const invalidFiles = fileRejections.map(({ file, errors }) => {
        (file as FileWithPreview).preview = URL.createObjectURL(file);
        (file as FileWithPreview).errors = errors;

        return file as FileWithPreview;
      });

      const newFiles = [...files, ...validFiles, ...invalidFiles];

      setFiles(newFiles);
    },
    [files, setFiles],
  );

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {},
    ),
    maxSize: maxFileSize,
    maxFiles: maxFiles,
    multiple: maxFiles !== 1,
  });

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const onUpload = useCallback(async () => {
    setLoading(true);

    // [Joshen] This is to support handling partial successes
    // If any files didn't upload for any reason, hitting "Upload" again will only upload the files that had errors
    const filesWithErrors = errors.map((x) => x.name);

    const filesToUpload =
      filesWithErrors.length > 0
        ? [
            ...files.filter((f) => filesWithErrors.includes(f.name)),
            ...files.filter((f) => !successes.includes(f.name)),
          ]
        : files;

    const responses = await Promise.all(
      filesToUpload.map(async (file) => {
        try {
          // Generate the appropriate filename based on settings
          const finalFileName = useUniqueFilenames
            ? generateUniqueFilename(file.name)
            : sanitizeFilename(file.name);

          // retrieve file path
          let filePath = path
            ? getFilePath(path, finalFileName)
            : finalFileName;

          const pathHasExtension = filePath.split('.').length > 1;

          // if the path does not have an extension, we need to add the filename to the path
          if (!pathHasExtension) {
            filePath = [filePath, finalFileName].join('/');
          }

          const { error } = await client.storage
            .from(bucketName)
            .upload(filePath, file, {
              cacheControl: cacheControl.toString(),
              upsert,
            });

          const fullFilePath = [bucketName, filePath].join('/');

          if (error) {
            return {
              name: file.name,
              message: `Upload failed: ${error.message}`,
              fullFilePath,
            };
          } else {
            return { name: file.name, message: undefined, fullFilePath };
          }
        } catch (error) {
          return {
            name: file.name,
            message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            fullFilePath: '',
          };
        }
      }),
    );

    const responseErrors = responses.filter((x) => x.message !== undefined);

    // if there were errors previously, this function tried to upload the files again so we should clear/overwrite the existing errors.

    setErrors(responseErrors);

    const responseSuccesses = responses.filter((x) => x.message === undefined);

    const newSuccesses = Array.from(
      new Set([...successes, ...responseSuccesses.map((x) => x.name)]),
    );

    setSuccesses(newSuccesses);

    if (responseSuccesses.length > 0) {
      const files = responseSuccesses.map((item) => {
        return item.fullFilePath;
      });

      onUploadSuccess?.(files);
    }

    setLoading(false);
  }, [
    files,
    path,
    bucketName,
    errors,
    successes,
    onUploadSuccess,
    client,
    useUniqueFilenames,
    cacheControl,
    upsert,
  ]);

  useEffect(() => {
    if (files.length === 0) {
      // eslint-disable-next-line
      setErrors([]);
    }

    // If the number of files doesn't exceed the maxFiles parameter, remove the error 'Too many files' from each file
    if (files.length <= maxFiles) {
      let changed = false;

      const newFiles = files.map((file) => {
        if (file.errors.some((e) => e.code === 'too-many-files')) {
          file.errors = file.errors.filter((e) => e.code !== 'too-many-files');
          changed = true;
        }
        return file;
      });

      if (changed) {
        setFiles(newFiles);
      }
    }
  }, [files.length, setFiles, maxFiles, files]);

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize: maxFileSize,
    maxFiles: maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  };
};

/**
 * Sanitizes a filename by removing or replacing invalid characters for Supabase storage
 * @param filename - The original filename
 * @returns A sanitized filename safe for Supabase storage
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace characters that are not allowed in Supabase storage paths
  // Allowed: word characters, dots, hyphens, underscores
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase(); // Convert to lowercase for consistency
}

/**
 * Generates a simple UUID v4 without external dependencies
 * @returns A UUID v4 string
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generates a unique file path with UUID prefix to prevent conflicts
 * @param originalFilename - The original filename
 * @returns A unique, sanitized filename
 */
function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const extension = sanitized.split('.').pop() || '';
  const nameWithoutExt = sanitized.replace(`.${extension}`, '');

  return `${generateUUID()}-${nameWithoutExt}${extension ? `.${extension}` : ''}`;
}

/**
 * Replaces the variables in the path with the values from the filename
 * @param path - The path to replace the variables in
 * @param filename - The filename to replace the variables in
 * @returns The path with the variables replaced
 */
function getFilePath(path: string, filename: string) {
  let transformedPath = path;

  const shortTimestamp = new Date().toISOString().split('T')[0]!;
  const sanitizedFilename = sanitizeFilename(filename);
  const extension = sanitizedFilename.split('.').pop() || '';

  const filenameWithoutExtension = sanitizedFilename.replace(
    `.${extension}`,
    '',
  );

  transformedPath = transformedPath.replace(
    '{filename}',
    filenameWithoutExtension,
  );

  transformedPath = transformedPath.replace('{extension}', extension);
  transformedPath = transformedPath.replace('{timestamp}', shortTimestamp);

  return transformedPath;
}

export {
  useSupabaseUpload,
  type UseSupabaseUploadOptions,
  type UseSupabaseUploadReturn,
};
