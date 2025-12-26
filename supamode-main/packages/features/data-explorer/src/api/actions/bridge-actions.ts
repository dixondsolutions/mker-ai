import { ActionFunctionArgs, redirect } from 'react-router';

import { getI18n } from 'react-i18next';
import z from 'zod';

import { createAction } from '@kit/shared/router-query-bridge';
import { buildResourceUrl, extractErrorMessage } from '@kit/shared/utils';
import { TableUiConfig } from '@kit/types';
import { toast } from '@kit/ui/sonner';

import { dataExplorerQueryKeys } from '../../lib/query-keys';
import { tableMetadataLoader } from '../loaders/table-structure-loader';
import { batchDeleteRecordsAction } from './batch-delete-records-action';
import {
  deleteRecordAction,
  deleteRecordByConditionsAction,
} from './delete-record-action';
import { insertRecordAction } from './insert-record-action';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from './saved-vews-actions';
import {
  updateRecordAction,
  updateRecordByConditionsAction,
} from './update-record-action';

const SchemaTableParamsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
});

// const IdParamsSchema = z.object({
//   id: z.string().min(1),
// });

/**
 * Bridge-powered action for record updates
 */
export const updateRecordBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const { schema, table, id } = SchemaTableParamsSchema.extend({
      id: z.string().min(1),
    }).parse(args.params);

    const data = await request.json();
    return updateRecordAction({ schema, table, id, data });
  },
  invalidateKeys: (args, _data) => {
    const { schema, table, id } = SchemaTableParamsSchema.extend({
      id: z.string().min(1),
    }).parse(args.params);

    return [
      // Invalidate all table data for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate this specific record
      dataExplorerQueryKeys.record(schema, table, id),
      // Invalidate all table data (pagination might change)
      ['table-data', schema, table],
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('dataExplorer:record.recordUpdated'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dataExplorer:record.recordUpdateFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for record updates by conditions
 */
export const updateRecordByConditionsBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    const conditions = Object.fromEntries(
      new URL(args.request.url).searchParams,
    );

    const data = await request.json();

    return updateRecordByConditionsAction({
      schema,
      table,
      conditions,
      data,
    });
  },
  invalidateKeys: (args) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const conditions = Object.fromEntries(
      new URL(args.request.url).searchParams,
    );

    return [
      // Invalidate all records for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate this specific record by conditions
      dataExplorerQueryKeys.record(schema, table, conditions),
      // Invalidate all table data
      ['table-data', schema, table],
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('dataExplorer:record.recordUpdated'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dataExplorer:record.recordUpdateFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for record deletion
 */
export const deleteRecordBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { schema, table, id } = SchemaTableParamsSchema.extend({
      id: z.string().min(1),
    }).parse(args.params);

    return deleteRecordAction({ schema, table, id });
  },
  invalidateKeys: (args) => {
    const { schema, table, id } = SchemaTableParamsSchema.extend({
      id: z.string().min(1),
    }).parse(args.params);

    return [
      // Invalidate all table data for this table
      ['table-data', schema, table],
      // Invalidate this specific record
      dataExplorerQueryKeys.record(schema, table, id),
      // Invalidate all records for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: (_, args) => {
    const t = getI18n().t;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    toast.success(t('dataExplorer:record.recordDeleted'));
    return redirect(`/resources/${schema}/${table}`);
  },
  onError: (error) => {
    const t = getI18n().t;

    const errorMessage = extractErrorMessage(error);

    toast.error(errorMessage || t('dataExplorer:record.recordDeletionFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for record deletion by conditions
 */
export const deleteRecordByConditionsBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const conditions = Object.fromEntries(
      new URL(args.request.url).searchParams,
    );

    return deleteRecordByConditionsAction({ schema, table, conditions });
  },
  invalidateKeys: (args) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const conditions = Object.fromEntries(
      new URL(args.request.url).searchParams,
    );

    return [
      // Invalidate all table data for this table
      ['table-data', schema, table],
      // Invalidate this specific record
      dataExplorerQueryKeys.record(schema, table, conditions),
      // Invalidate all records for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: (data, args) => {
    const t = getI18n().t;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    toast.success(t('dataExplorer:record.recordDeleted'));
    return redirect(`/resources/${schema}/${table}`);
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dataExplorer:record.recordDeletionFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for record creation
 */
export const insertRecordBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const { data } = await request.clone().json();

    return insertRecordAction({ schema, table, data });
  },
  invalidateKeys: (args) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    return [
      // Invalidate all table data for this table
      ['table-data', schema, table],
      // Invalidate all records for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: async (response, args) => {
    const t = getI18n().t;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    if (response?.data?.error) {
      throw new Error(response.data.error);
    }

    toast.success(t('dataExplorer:record.recordCreated'));

    // Build URL for the created record
    const metadata = await tableMetadataLoader({ schema, table });

    const uiConfig = metadata.table.uiConfig ?? {
      primary_keys: [],
      unique_constraints: [],
    };

    const url = buildResourceUrl({
      schema,
      table,
      record: response.data.data,
      tableMetadata: uiConfig as TableUiConfig,
    });

    return redirect(url);
  },
  onError: (error) => {
    const t = getI18n().t;

    const errorMessage = extractErrorMessage(error);

    toast.error(errorMessage || t('dataExplorer:record.recordCreationFailed'));

    throw error;
  },
});

/**
 * Bridge-powered action for batch deletion
 */
export const batchDeleteRecordsBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const { payload } = await request.json();
    const { items } = payload;

    return batchDeleteRecordsAction({ schema, table, items });
  },
  invalidateKeys: (args) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    return [
      // Invalidate all table data for this table
      ['table-data', schema, table],
      // Invalidate all records for this table
      dataExplorerQueryKeys.allForTable(schema, table).records(),
      // Invalidate combined loader
      ['combined-table-route', schema, table],
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    const { successCount, failureCount } = data.data;

    if (failureCount > 0) {
      toast.success(
        t('dataExplorer:record.recordsPartiallyDeleted', {
          successCount,
          failureCount,
        }),
      );
    } else {
      toast.success(
        t('dataExplorer:record.recordsDeleted', {
          count: successCount,
        }),
      );
    }

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);

    toast.error(errorMessage || t('dataExplorer:record.recordsDeletionFailed'));

    throw error;
  },
});

/**
 * Bridge-powered action for saved view operations
 */
export const savedViewsBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);
    const { intent, data } = await request.json();

    const result = await (() => {
      switch (intent) {
        case 'create-saved-view': {
          const { name, description, roles, config } = data;

          return createSavedViewAction({
            name,
            description,
            roles,
            config,
            schema,
            table,
          });
        }
        case 'update-saved-view': {
          return updateSavedViewAction({
            ...data,
            schema,
            table,
          });
        }
        case 'delete-saved-view': {
          const { viewId } = data;

          return deleteSavedViewAction({ viewId, schema, table });
        }
        default:
          throw new Error(`Unknown saved view intent: ${intent}`);
      }
    })();

    return { result, intent };
  },
  invalidateKeys: (args) => {
    const { schema, table } = SchemaTableParamsSchema.parse(args.params);

    return [
      // Invalidate saved views for this table
      dataExplorerQueryKeys.savedViews(schema, table),
      // Invalidate table metadata (which now includes saved views)
      dataExplorerQueryKeys.tableMetadata(schema, table),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    const { intent } = data;

    switch (intent) {
      case 'create-saved-view':
        toast.success(t('dataExplorer:views.viewCreated'));
        break;
      case 'update-saved-view':
        toast.success(t('dataExplorer:views.viewUpdated'));
        break;
      case 'delete-saved-view':
        toast.success(t('dataExplorer:views.viewDeleted'));
        break;
    }

    return data.result;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);

    toast.error(errorMessage || t('dataExplorer:views.operationFailed'));
    throw error;
  },
});
