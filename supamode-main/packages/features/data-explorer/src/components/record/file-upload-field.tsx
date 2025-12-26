import { ControllerRenderProps, useFormContext } from 'react-hook-form';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { ColumnMetadata } from '@kit/types';
import { FileUploader } from '@kit/ui/file-uploader';

interface FileUploadConfig {
  storage_bucket: string;
  storage_path_template: string;
  allowed_file_types: string[];
  replace_existing?: boolean;
  max_file_size?: number | null | undefined;
}

interface FileUploadFieldProps {
  field: ControllerRenderProps;
  column: ColumnMetadata;
  placeholder?: string;
}

/**
 * File upload field component that handles uploads to Supabase Storage
 */
export function FileUploadField({ column }: FileUploadFieldProps) {
  const client = useSupabase();

  const storageConfig = column.ui_config
    ?.ui_data_type_config as unknown as FileUploadConfig;

  const form = useFormContext();

  return (
    <FileUploader
      maxFiles={1}
      bucketName={storageConfig.storage_bucket}
      path={storageConfig.storage_path_template}
      client={client}
      maxFileSize={storageConfig.max_file_size ?? Number.POSITIVE_INFINITY}
      allowedMimeTypes={storageConfig.allowed_file_types}
      onUploadSuccess={(publicUrls) => {
        // we only support one file at a time for now
        form.setValue(column.name, publicUrls[0], {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }}
    />
  );
}
