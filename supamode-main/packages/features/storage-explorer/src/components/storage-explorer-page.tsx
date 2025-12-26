import { useCallback } from 'react';

import { useLoaderData, useNavigate } from 'react-router';

import { FolderIcon } from 'lucide-react';

import { CardButton, CardButtonHeader } from '@kit/ui/card-button';
import {
  EmptyState,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

interface StorageExplorerPageData {
  buckets: StorageBucket[];
}

export function StorageExplorerPage() {
  const { buckets } = useLoaderData<StorageExplorerPageData>();

  const navigate = useNavigate();

  const handleBucketClick = useCallback(
    (bucket: StorageBucket) => {
      navigate(`/assets/${bucket.name}`);
    },
    [navigate],
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col px-4 py-2.5">
          <Heading level={4}>
            <Trans i18nKey="storageExplorer:title" />
          </Heading>

          <Heading level={6} className={'text-muted-foreground font-normal'}>
            <Trans i18nKey="storageExplorer:subtitle" />
          </Heading>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-auto px-4 py-2.5">
        {buckets.length === 0 ? (
          <EmptyState className="flex flex-1 flex-col items-center justify-center">
            <EmptyStateHeading className="flex flex-col items-center justify-center">
              <FolderIcon className="text-muted-foreground mb-4 h-12 w-12" />

              <h3 className="mb-2 text-lg font-medium">
                <Trans i18nKey="storageExplorer:noBucketsTitle" />
              </h3>
            </EmptyStateHeading>

            <EmptyStateText>
              <Trans i18nKey="storageExplorer:noBucketsDescription" />
            </EmptyStateText>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {buckets.map((bucket) => (
              <CardButton
                key={bucket.id}
                className="group cursor-pointer rounded-md"
                onClick={() => handleBucketClick(bucket)}
              >
                <CardButtonHeader className="flex items-center gap-x-4">
                  <FolderIcon className="h-4 w-4" />

                  <h3 className="max-w-[120px] truncate text-sm font-medium">
                    {bucket.name}
                  </h3>
                </CardButtonHeader>
              </CardButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
