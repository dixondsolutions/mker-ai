import { createLoader } from '@kit/shared/router-query-bridge';

import {
  auditLogDetailsLoader,
  auditLogsLoader,
  memberAuditLogsLoader,
} from '../../loaders';

/**
 * Query key factory for audit logs
 */
export const auditLogsQueryKeys = {
  all: ['audit-logs'] as const,
  logs: (filters?: {
    cursor?: string;
    limit?: number;
    author?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => [...auditLogsQueryKeys.all, 'logs', filters] as const,
  logDetails: (id: string) =>
    [...auditLogsQueryKeys.all, 'log-details', id] as const,
  memberLogs: (userId: string, cursor?: string, limit?: number) =>
    [
      ...auditLogsQueryKeys.all,
      'member-logs',
      userId,
      { cursor, limit },
    ] as const,
};

/**
 * Bridge-powered loader for audit logs
 * Short stale time for audit data freshness
 */
export const auditLogsBridgeLoader = createLoader({
  queryKey: ({ request }) => {
    const urlParams = getSearchParams(request.url);
    const cursor = getParam(urlParams, 'cursor');
    const limit = getLimit(urlParams);

    const author = getParam(urlParams, 'author');
    const action = getParam(urlParams, 'action');
    const startDate = getParam(urlParams, 'startDate');
    const endDate = getParam(urlParams, 'endDate');

    return auditLogsQueryKeys.logs({
      cursor,
      limit,
      author,
      action,
      startDate,
      endDate,
    });
  },
  queryFn: async ({ request }) => {
    const urlParams = getSearchParams(request.url);
    const cursor = getParam(urlParams, 'cursor');
    const limit = getLimit(urlParams);

    const author = getParam(urlParams, 'author');
    const action = getParam(urlParams, 'action');
    const startDate = getParam(urlParams, 'startDate');
    const endDate = getParam(urlParams, 'endDate');

    return auditLogsLoader({
      cursor,
      limit,
      author,
      action,
      startDate,
      endDate,
    });
  },
  staleTime: 15 * 1000, // 15 seconds - audit logs should be relatively fresh
});

/**
 * Bridge-powered loader for audit log details
 * Short stale time for audit data freshness
 */
export const auditLogDetailsBridgeLoader = createLoader({
  queryKey: ({ params }) => {
    const id = params['id'] as string;
    return auditLogsQueryKeys.logDetails(id);
  },
  queryFn: async ({ params }) => {
    const id = params['id'] as string;
    return auditLogDetailsLoader(id);
  },
  staleTime: 30 * 1000, // 30 seconds - log details are more static
});

/**
 * Bridge-powered loader for member audit logs
 * Short stale time for audit data freshness
 */
export const memberAuditLogsBridgeLoader = createLoader({
  queryKey: ({ params, request }) => {
    const userId = params['id'] as string;
    const urlParams = getSearchParams(request.url);
    const cursor = getParam(urlParams, 'cursor');
    const limit = getLimit(urlParams);

    return auditLogsQueryKeys.memberLogs(userId, cursor, limit);
  },
  queryFn: async ({ params, request }) => {
    const userId = params['id'] as string;
    const urlParams = getSearchParams(request.url);
    const cursor = getParam(urlParams, 'cursor');
    const limit = getLimit(urlParams);

    return memberAuditLogsLoader({ userId, cursor, limit });
  },
  staleTime: 15 * 1000, // 15 seconds - member audit logs should be fresh
});

function getLimit(urlParams: URLSearchParams) {
  return urlParams.get('limit')
    ? parseInt(urlParams.get('limit')!, 10)
    : undefined;
}

function getSearchParams(url: string) {
  return new URL(url).searchParams;
}

function getParam(
  urlParams: URLSearchParams,
  name: string,
  defaultValue = undefined,
) {
  return urlParams.get(name) ?? defaultValue;
}
