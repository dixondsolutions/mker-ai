import { useState } from 'react';

import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { FormControl, FormField, FormItem, FormLabel } from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { StorageBucketSelect } from './storage-bucket-select';

interface StorageBucketFieldProps {
  form: UseFormReturn<Record<string, unknown>>;
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function StorageBucketField({
  form,
  name,
  label,
  placeholder,
  disabled,
}: StorageBucketFieldProps) {
  const { t } = useTranslation();
  const [selectedBucket, setSelectedBucket] = useState<string>('');

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label || t('storageExplorer:bucket')}</FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <StorageBucketSelect
                  value={field.value as string}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedBucket(value);
                  }}
                  placeholder={placeholder}
                  disabled={disabled}
                />
              </div>
              <If condition={selectedBucket}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This could open a file picker or navigate to the bucket
                  }}
                >
                  <Trans i18nKey="common:browse" />
                </Button>
              </If>
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
