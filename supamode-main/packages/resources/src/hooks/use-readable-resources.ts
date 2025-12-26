import { useQuery } from '@tanstack/react-query';

import { readableResourcesLoader } from '../loaders/readable-resources-loader';

/**
 * @name useReadableResources
 * @description Hook to fetch all readable resources for the current user
 */
export function useReadableResources() {
  return useQuery({
    queryFn: readableResourcesLoader,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryKey: ['readable-resources'],
  });
}
