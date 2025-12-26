import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { If } from '@kit/ui/if';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { Trans } from '@kit/ui/trans';

import { useStorageBuckets } from './hooks/use-storage-buckets';

interface StorageBucketSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function StorageBucketSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
}: StorageBucketSelectProps) {
  const { t } = useTranslation();
  const { data: buckets, isLoading, error } = useStorageBuckets();

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  if (error) {
    return (
      <div className="border-input bg-background text-muted-foreground flex h-9 w-full items-center justify-center rounded-md border px-3 py-2 text-sm">
        <Trans i18nKey="common:error" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue
          placeholder={placeholder || t('storageExplorer:selectBucket')}
        />
      </SelectTrigger>
      <SelectContent>
        <If
          condition={buckets && buckets.length > 0}
          fallback={
            <div className="text-muted-foreground flex items-center justify-center py-4 text-sm">
              <Trans i18nKey="storageExplorer:noBuckets" />
            </div>
          }
        >
          {buckets?.map((bucket) => (
            <SelectItem key={bucket.name} value={bucket.name}>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-500" />
                <span>{bucket.name}</span>
                <If condition={bucket.public}>
                  <span className="text-muted-foreground ml-2 text-xs">
                    (Public)
                  </span>
                </If>
              </div>
            </SelectItem>
          ))}
        </If>
      </SelectContent>
    </Select>
  );
}
