import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import {
  GetAuditLogDetailsRoute,
  GetAuditLogsRoute,
  GetMemberAuditLogsRoute,
} from './api/routes';

/**
 * Load audit logs
 */
export async function auditLogsLoader(params: {
  cursor?: string;
  limit?: number;
  author?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  const client = createHonoClient<GetAuditLogsRoute>();

  const query: Record<string, string> = {};

  if (params.cursor) {
    query['cursor'] = params.cursor;
  }

  if (params.limit) {
    query['limit'] = params.limit.toString();
  }

  if (params.author) {
    query['author'] = params.author;
  }

  if (params.action) {
    query['action'] = params.action;
  }

  if (params.startDate) {
    query['startDate'] = params.startDate;
  }

  if (params.endDate) {
    query['endDate'] = params.endDate;
  }

  const response = await client['v1']['audit-logs'].$get({
    query,
  });

  return handleHonoClientResponse(response);
}

/**
 * Load audit log details
 * @param id - The audit log ID
 */
export async function auditLogDetailsLoader(id: string) {
  const client = createHonoClient<GetAuditLogDetailsRoute>();

  const response = await client['v1']['audit-logs'][':id'].$get({
    param: { id },
  });

  return handleHonoClientResponse(response);
}

/**
 * Load member audit logs
 */
export async function memberAuditLogsLoader(params: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const client = createHonoClient<GetMemberAuditLogsRoute>();

  const query: Record<string, string> = {};

  if (params.cursor) {
    query['cursor'] = params.cursor;
  }

  if (params.limit) {
    query['limit'] = params.limit.toString();
  }

  const response = await client['v1']['audit-logs']['member'][':id'].$get({
    param: { id: params.userId },
    query,
  });

  return handleHonoClientResponse(response);
}
