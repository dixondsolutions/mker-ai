import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetFieldValuesRoute, GetTableRoute } from '../routes';

/**
 * @name tableRouteLoader
 * @description Loader for the table route
 * @param params
 */
export async function tableRouteLoader(params: {
  schema: string;
  table: string;
  page: number;
  pageSize?: number;
  search: string;
  properties: string | undefined;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}) {
  const client = createHonoClient<GetTableRoute>();

  const query: Partial<{
    sort_column: string;
    sort_direction: string;
    search: string;
    properties: string;
    page: string;
    page_size: string;
  }> = {};

  if (params.sortColumn) {
    query.sort_column = params.sortColumn;
  }

  if (params.sortDirection) {
    query.sort_direction = params.sortDirection;
  }

  if (params.search) {
    query.search = params.search;
  }

  if (params.properties) {
    query.properties = params.properties;
  }

  if (params.page) {
    query.page = params.page.toString();
  }

  if (params.pageSize) {
    query.page_size = params.pageSize.toString();
  }

  const response = await client['v1']['tables'][':schema'][':table'].$get({
    param: {
      schema: params.schema,
      table: params.table,
    },
    query,
  });

  return handleHonoClientResponse(response);
}

/**
 * @name fieldValuesLoader
 * @description Loader for getting field values
 * @param params
 */
export async function fieldValuesLoader(params: {
  schema: string;
  table: string;
  field: string;
  search?: string;
  limit?: number;
  includeTopHits?: boolean;
}) {
  const client = createHonoClient<GetFieldValuesRoute>();

  const query: Partial<{
    search: string;
    limit: string;
    include_top_hits: string;
  }> = {};

  if (params.search) {
    query.search = params.search;
  }

  if (params.limit) {
    query.limit = params.limit.toString();
  }

  if (params.includeTopHits) {
    query.include_top_hits = params.includeTopHits.toString();
  }

  const response = await client['v1']['tables'][':schema'][':table']['fields'][
    ':field'
  ]['values'].$get({
    param: {
      schema: params.schema,
      table: params.table,
      field: params.field,
    },
    query,
  });

  return handleHonoClientResponse(response);
}
