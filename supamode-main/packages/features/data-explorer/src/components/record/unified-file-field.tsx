import { useCallback, useMemo, useState } from 'react';

import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { FileUploader } from '@kit/ui/file-uploader';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { useRecordValue } from './record-value-context';
import { StorageFilePicker } from './storage-file-picker';

interface UnifiedFileFieldProps {
  field: ControllerRenderProps;
  column: ColumnMetadata;
  placeholder?: string;
}

interface FileUploadConfig {
  storage_bucket: string;
  storage_path_template: string;
  allowed_file_types: string[];
  replace_existing?: boolean;
  max_file_size?: number | null | undefined;
}

export function UnifiedFileField({
  field,
  column,
  placeholder,
}: UnifiedFileFieldProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const client = useSupabase();

  const currentUrl = useMemo(() => {
    // Check if it's a valid URL or relative path that could be an image
    let path = field.value as string;

    if (!path) {
      return '';
    }

    try {
      const url = new URL(path);

      // If it's a valid URL, we can use it directly
      path = url.href;
    } catch {
      // Check if it looks like a Supabase storage path (bucket/path format without protocol)
      // Only treat as storage path if it doesn't contain a protocol and has proper bucket/path structure
      if (!path.includes('://') && path.includes('/')) {
        const [bucket, ...rest] = path.split('/');
        const parts = rest.join('/');

        if (bucket && parts) {
          path = client.storage.from(bucket).getPublicUrl(parts).data.publicUrl;
        } else {
          return '';
        }
      } else {
        // If it contains a protocol but still failed URL parsing, it's malformed
        return '';
      }
    }

    return path;
  }, [client.storage, field.value]);

  const hasValue = Boolean(currentUrl);

  // Get storage configuration from column metadata
  const storageConfig = column.ui_config
    ?.ui_data_type_config as unknown as FileUploadConfig;

  // Handle file upload success
  const handleUploadSuccess = useCallback(
    (urls: string[]) => {
      if (urls[0]) {
        field.onChange(urls[0], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
    },
    [field],
  );

  // Handle file picker selection
  const handleFilePickerSelect = useCallback(
    (url: string) => {
      field.onChange(url, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [field],
  );

  // Handle manual URL input
  const handleManualInput = useCallback(
    (url: string) => {
      field.onChange(url, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [field],
  );

  // Clear selection
  const handleClear = useCallback(() => {
    field.onChange(null, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [field]);

  // Get filename from URL
  const getFilename = useCallback(() => {
    if (!currentUrl) return '';

    try {
      const url = new URL(currentUrl);
      const pathParts = url.pathname.split('/');

      return pathParts[pathParts.length - 1] || 'Unknown file';
    } catch {
      return 'Invalid URL';
    }
  }, [currentUrl]);

  // Check if file is an image
  const isImage = useCallback(() => {
    if (!currentUrl) {
      return false;
    }

    const filename = getFilename().toLowerCase();

    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.svg',
      '.bmp',
    ];

    return imageExtensions.some((ext) => filename.endsWith(ext));
  }, [currentUrl, getFilename]);

  const value = useRecordValue();

  const path = useMemo(() => {
    let path = storageConfig?.storage_path_template;

    // replace keys in the path with the values from the record
    // ex. /files/{id} -> /files/123 if value.id = 123
    Object.entries(value).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value as string);
    });

    return path;
  }, [storageConfig, value]);

  return (
    <div className="space-y-4">
      {/* Current Selection Display */}
      <If condition={hasValue}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <Check className="h-4 w-4 text-green-500" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-4">
                    <span className="truncate text-sm font-medium">
                      {getFilename()}
                    </span>
                  </div>

                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {currentUrl}
                  </p>
                </div>
              </div>

              {/* Image Preview */}
              <If condition={isImage()}>
                <div className="mt-3 ml-5">
                  <img
                    src={currentUrl}
                    alt={getFilename()}
                    className="max-h-48 max-w-full rounded-lg border object-contain"
                  />
                </div>
              </If>

              <div className="ml-5 flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <X className="mr-1 h-3 w-3" />
                  <Trans i18nKey="dataExplorer:record.clear" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </If>

      <If condition={!hasValue}>
        {/* File Selection Methods */}
        <div className="max-w-xl space-y-2">
          {/* Upload New File */}
          <div>
            <FileUploader
              maxFiles={1}
              bucketName={storageConfig?.storage_bucket || 'files'}
              path={path}
              client={client}
              maxFileSize={
                storageConfig?.max_file_size ?? Number.POSITIVE_INFINITY
              }
              allowedMimeTypes={storageConfig?.allowed_file_types || []}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>

          <div className="flex items-center space-x-4">
            <Separator className="flex-1" />

            <span className="text-muted-foreground text-xs uppercase">
              <Trans i18nKey="dataExplorer:record.or" />
            </span>

            <Separator className="flex-1" />
          </div>

          {/* Browse Existing Files */}
          <div>
            <StorageFilePicker
              field={{
                ...field,
                onChange: handleFilePickerSelect,
              }}
            />
          </div>

          {/* Advanced Options Toggle */}
          <div>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              {showAdvanced ? (
                <ChevronDown className="mr-1 h-3 w-3" />
              ) : (
                <ChevronRight className="mr-1 h-3 w-3" />
              )}
              <Trans i18nKey="dataExplorer:record.advancedOptions" />
            </Button>
          </div>

          {/* Advanced Manual URL Entry */}
          <If condition={showAdvanced}>
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="mb-2 flex items-center text-sm font-medium">
                  <ExternalLink className="mr-2 inline h-4 w-4" />

                  <Trans i18nKey="dataExplorer:record.enterUrlManually" />
                </Label>

                <Input
                  type="url"
                  placeholder={placeholder || 'https://example.com/file.jpg'}
                  value={currentUrl || ''}
                  onChange={(e) => handleManualInput(e.target.value)}
                  className={cn('transition-colors')}
                />

                <p className="text-muted-foreground mt-1 text-xs">
                  <Trans i18nKey="dataExplorer:record.manualUrlHelp" />
                </p>
              </div>
            </div>
          </If>
        </div>

        {/* Help Text */}
        <div className="text-muted-foreground bg-muted/50 mt-4 rounded-lg p-3 text-xs">
          <Trans i18nKey="dataExplorer:record.fileFieldHelp" />
        </div>
      </If>
    </div>
  );
}
