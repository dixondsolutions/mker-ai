import { useQuery } from '@tanstack/react-query';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';
import type { GetStorageBucketsRoute } from '@kit/storage-explorer/routes';

export function useStorageBuckets() {
  return useQuery({
    queryKey: ['storage-buckets'],
    queryFn: async () => {
      const client = createHonoClient<GetStorageBucketsRoute>();

      const response = await client['v1']['storage']['buckets'].$get();
      const result = await handleHonoClientResponse(response);

      return result.buckets;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
