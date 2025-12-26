import { createLoader } from '@kit/shared/router-query-bridge';

import { bucketContentsLoader, storageBucketsLoader } from '../../loaders';

/**
 * Query key factory for storage explorer
 */
export const storageExplorerQueryKeys = {
  all: ['storage-explorer'] as const,
  buckets: () => [...storageExplorerQueryKeys.all, 'buckets'] as const,
  bucketContents: (
    bucket: string,
    path?: string,
    search?: string,
    page?: number,
  ) =>
    [
      ...storageExplorerQueryKeys.all,
      'bucket-contents',
      bucket,
      path,
      search,
      page,
    ].filter(Boolean),
};

/**
 * Bridge-powered loader for storage buckets
 * Provides smart caching for storage bucket listings
 */
export const storageBucketsBridgeLoader = createLoader({
  queryKey: storageExplorerQueryKeys.buckets(),
  queryFn: async () => {
    return storageBucketsLoader();
  },
  staleTime: 60 * 1000, // 1 minute - bucket list doesn't change often
});

/**
 * Bridge-powered loader for bucket contents
 * Provides smart caching for bucket file listings
 */
export const bucketContentsBridgeLoader = createLoader({
  queryKey: ({ params, request }) => {
    const bucket = params['bucket'] as string;
    const pathParam = (params['*'] as string) || '';

    // Extract search parameters from URL
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;

    return storageExplorerQueryKeys.bucketContents(
      bucket,
      pathParam || undefined,
      search,
      page,
    );
  },
  queryFn: async ({ params, request }) => {
    const bucket = params['bucket'] as string;
    const pathParam = (params['*'] as string) || '';

    // Extract search parameters from URL
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const search = searchParams.get('search') || undefined;
    const page = Number(searchParams.get('page')) || 1;

    return bucketContentsLoader({
      bucket,
      path: pathParam || undefined,
      search,
      page,
    });
  },
  staleTime: 30 * 1000, // 30 seconds - file listings change more frequently
});
