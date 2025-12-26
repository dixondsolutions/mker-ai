import { LoaderFunctionArgs } from 'react-router';

import z from 'zod';

import { createLoader } from '@kit/shared/router-query-bridge';

import { dataExplorerQueryKeys } from '../../lib/query-keys';
import { dataRecordPermissionsLoader } from './permissions-loader';
import { recordLoader } from './record-loader';
import { savedViewsLoader } from './saved-views-loader';
import { tableRouteLoader } from './table-route-loader';
import { tableMetadataLoader } from './table-structure-loader';

const SchemaTableParamsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
});

const IdParamsSchema = z.object({
  id: z.string().min(1),
});

/**
 * Bridge-powered loader for record data
 */
export const recordBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const { id } = IdParamsSchema.parse(args.params);

    return dataExplorerQueryKeys.record(schema, table, id);
  },
  queryFn: async ({ params }) => {
    const { schema, table } = SchemaTableParamsSchema.parse(params);
    const { id } = IdParamsSchema.parse(params);

    return recordLoader({
      schema,
      table,
      keyValues: { id },
    });
  },
  staleTime: 15 * 1000, // 15 seconds
});

/**
 * Bridge-powered loader for record data by conditions
 */
export const recordByConditionsBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const searchParams = new URL(args.request.url).searchParams;
    const conditions = Object.fromEntries(searchParams.entries());

    return dataExplorerQueryKeys.record(schema, table, conditions);
  },
  queryFn: async ({ request, params }) => {
    const { schema, table } = SchemaTableParamsSchema.parse(params);
    const searchParams = new URL(request.url).searchParams;
    const keyValues = Object.fromEntries(searchParams.entries());

    return recordLoader({
      schema,
      table,
      keyValues,
    });
  },
  staleTime: 15 * 1000, // 15 seconds
});

/**
 * Bridge-powered loader for table metadata, saved views, and permissions
 */
export const tableMetadataBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    return dataExplorerQueryKeys.tableMetadata(schema, table);
  },
  queryFn: async ({ params }) => {
    const { schema, table } = SchemaTableParamsSchema.parse(params);

    // Load table metadata, saved views, and permissions in parallel
    const [metadata, savedViews, permissions] = await Promise.all([
      tableMetadataLoader({ schema, table }),
      savedViewsLoader({ schema, table }),
      dataRecordPermissionsLoader({ schema, table }),
    ]);

    return {
      ...metadata,
      savedViews,
      permissions,
    };
  },
  staleTime: 5 * 60 * 1000, // 5 minutes - metadata changes infrequently
});

/**
 * Bridge-powered loader for table data (paginated records with filters)
 */
export const tableDataBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const url = new URL(args.request.url);
    const searchParams = url.searchParams;

    const {
      page = 1,
      search = '',
      sort_column,
      sort_direction,
      ...properties
    } = Object.fromEntries(searchParams.entries());

    const filters = {
      page: Number(page),
      search,
      sort_column,
      sort_direction,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    };

    return dataExplorerQueryKeys.tableData(schema, table, filters);
  },
  queryFn: async ({ request, params }) => {
    const { schema, table } = SchemaTableParamsSchema.parse(params);
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const {
      // extract known filters from the URL
      page = 1,
      search = '',
      sort_column,
      sort_direction,
      // exclude the view property from the properties
      view: _,
      ...properties
    } = Object.fromEntries(searchParams.entries());

    return tableRouteLoader({
      schema,
      table,
      page: Number(page),
      search,
      sortColumn: sort_column,
      sortDirection: sort_direction as 'asc' | 'desc' | undefined,
      properties:
        Object.keys(properties).length > 0
          ? JSON.stringify(properties)
          : undefined,
    });
  },
  staleTime: 30 * 1000, // 30 seconds
});
