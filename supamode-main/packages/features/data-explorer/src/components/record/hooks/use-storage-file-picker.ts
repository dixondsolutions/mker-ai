import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Subject,
  catchError,
  debounce,
  debounceTime,
  of,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type {
  GetBucketContentsRoute,
  GetStorageBucketsRoute,
} from '../../../../../storage-explorer/src/api/routes';

type Bucket = {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  updated_at: string;
};

type StorageFile = {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
  isDirectory: boolean;
  fileType: string;
  publicUrl?: string;
  previewUrl?: string;
  permissions?: {
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canUpload: boolean;
  };
};

// Hook for loading storage buckets with search
export function useBuckets() {
  const [state, setState] = useState({
    data: [] as Bucket[],
    loading: false,
    error: null as string | null,
  });

  // Create a subject for search input
  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  useEffect(() => {
    // Set up the search subscription
    const subscription = searchSubject$
      .pipe(
        // Clear the results when the search query changes
        tap(() => {
          setState((prev) => ({
            ...prev,
            data: [],
            loading: false,
            error: null,
          }));
        }),
        // Set the loading state to true when the search query changes
        tap(() => {
          setState((prev) => ({
            ...prev,
            loading: true,
          }));
        }),
        // Debounce the search query to prevent excessive API calls
        debounce((searchQuery) => (searchQuery ? timer(1000) : timer(0))),
        startWith(''),
        // Run the search query
        switchMap(async (searchQuery) => {
          try {
            const client = createHonoClient<GetStorageBucketsRoute>();
            const response = await client['v1']['storage']['buckets'].$get();
            const result = await handleHonoClientResponse(response);

            let buckets = result.buckets || [];

            // Client-side bucket filtering since buckets are usually few
            if (searchQuery && searchQuery.trim()) {
              const searchLower = searchQuery.toLowerCase();

              buckets = buckets.filter((bucket: Bucket) =>
                bucket.name.toLowerCase().includes(searchLower),
              );
            }

            return {
              data: buckets,
              error: null,
            };
          } catch (error) {
            return {
              data: [],
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load buckets',
            };
          }
        }),
        // Set the loading state to false when the search query is complete
        catchError((error) => {
          return of({
            data: [] as Bucket[],
            error:
              error instanceof Error ? error.message : 'Failed to load buckets',
          });
        }),
      )
      .subscribe((response) => {
        setState(() => ({
          data: response.data,
          error: response.error,
          loading: false,
        }));
      });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [searchSubject$]);

  const triggerSearch = useCallback(
    (searchTerm: string) => {
      searchSubject$.next(searchTerm);
    },
    [searchSubject$],
  );

  return useMemo(() => {
    return {
      ...state,
      triggerSearch,
    };
  }, [state, triggerSearch]);
}

// Hook for loading bucket contents with search
export function useBucketContents() {
  const [state, setState] = useState({
    data: [] as StorageFile[],
    loading: false,
    error: null as string | null,
  });

  // Create a subject for search input
  const searchSubject$ = useMemo(
    () => new Subject<{ bucket: string; path: string; searchTerm: string }>(),
    [],
  );

  useEffect(() => {
    // Set up the search subscription
    const subscription = searchSubject$
      .pipe(
        // Clear the results when the search query changes
        tap(() => {
          setState((prev) => ({
            ...prev,
            data: [],
            loading: false,
            error: null,
          }));
        }),
        // Set the loading state to true when the search query changes
        tap(() => {
          setState((prev) => ({
            ...prev,
            loading: true,
          }));
        }),
        // Apply conditional debouncing
        switchMap(({ bucket, path, searchTerm }) =>
          searchTerm
            ? of({ bucket, path, searchTerm }).pipe(debounceTime(1000))
            : of({ bucket, path, searchTerm }),
        ),
        // Run the search query
        switchMap(async ({ bucket, path, searchTerm }) => {
          try {
            if (!bucket) {
              return {
                data: [],
                error: null,
              };
            }

            const client = createHonoClient<GetBucketContentsRoute>();

            const queryParams: { path?: string; search?: string } = {};

            if (path) {
              queryParams.path = path;
            }

            if (searchTerm) {
              queryParams.search = searchTerm;
            }

            const response = await client['v1']['storage']['buckets'][
              ':bucket'
            ]['contents'].$get({
              param: { bucket },
              query: queryParams,
            });

            const result = await handleHonoClientResponse(response);

            return {
              data: result.contents || [],
              error: null,
            };
          } catch (error) {
            return {
              data: [],
              error:
                error instanceof Error ? error.message : 'Failed to load files',
            };
          }
        }),
        // Set the loading state to false when the search query is complete
        catchError((error) => {
          return of({
            data: [] as StorageFile[],
            error:
              error instanceof Error ? error.message : 'Failed to load files',
          });
        }),
      )
      .subscribe((response) => {
        setState(() => ({
          data: response.data,
          error: response.error,
          loading: false,
        }));
      });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [searchSubject$]);

  const triggerSearch = useCallback(
    (bucket: string, path: string = '', searchTerm: string = '') => {
      searchSubject$.next({ bucket, path, searchTerm });
    },
    [searchSubject$],
  );

  return useMemo(() => {
    return {
      ...state,
      triggerSearch,
    };
  }, [state, triggerSearch]);
}

// Hook for managing file picker navigation state
export function useFilePickerNavigation(
  onNavigate?: (bucket: string, path: string, searchTerm: string) => void,
) {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleBucketSelect = useCallback(
    (bucketName: string) => {
      setSelectedBucket(bucketName);
      setCurrentPath('');
      setSearchTerm('');

      // Trigger search for files in the selected bucket
      if (onNavigate) {
        onNavigate(bucketName, '', '');
      }
    },
    [onNavigate],
  );

  const handleFolderClick = useCallback(
    (folderName: string) => {
      const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      setCurrentPath(newPath);

      // Trigger search for files in the new path
      if (onNavigate && selectedBucket) {
        onNavigate(selectedBucket, newPath, searchTerm);
      }
    },
    [currentPath, onNavigate, searchTerm, selectedBucket],
  );

  const handleGoBack = useCallback(() => {
    if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();

      const newPath = pathParts.join('/');

      setCurrentPath(newPath);
      // Trigger search for files in the parent path
      if (onNavigate && selectedBucket) {
        onNavigate(selectedBucket, newPath, searchTerm);
      }
    } else {
      setSelectedBucket(null);
    }
  }, [currentPath, onNavigate, searchTerm, selectedBucket]);

  const resetNavigation = useCallback(() => {
    setSelectedBucket(null);
    setCurrentPath('');
    setSearchTerm('');
  }, []);

  // Breadcrumb path display
  const pathSegments = useMemo(() => {
    return currentPath ? currentPath.split('/') : [];
  }, [currentPath]);

  return useMemo(() => {
    return {
      selectedBucket,
      currentPath,
      searchTerm,
      pathSegments,
      setSearchTerm,
      handleBucketSelect,
      handleFolderClick,
      handleGoBack,
      resetNavigation,
    };
  }, [
    selectedBucket,
    currentPath,
    searchTerm,
    pathSegments,
    setSearchTerm,
    handleBucketSelect,
    handleFolderClick,
    handleGoBack,
    resetNavigation,
  ]);
}

export type { Bucket, StorageFile };
