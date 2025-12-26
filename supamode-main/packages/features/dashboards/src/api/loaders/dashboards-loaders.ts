import { LoaderFunctionArgs } from 'react-router';

import z from 'zod';

import { createLoader } from '@kit/shared/router-query-bridge';

import { dashboardsQueryKeys } from '../../lib/query-keys';
import {
  dashboardLoader,
  dashboardsLoader,
  searchDashboardsLoader,
  widgetDataLoader,
} from './bridge-loaders';

const DashboardParamsSchema = z.object({
  dashboardId: z.string().uuid(),
});

const WidgetParamsSchema = z.object({
  widgetId: z.string().uuid(),
});

/**
 * Bridge-powered loader for dashboards list
 */
export const dashboardsBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const url = new URL(args.request.url);

    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const search = url.searchParams.get('search') || undefined;

    const filter =
      (url.searchParams.get('filter') as 'all' | 'owned' | 'shared') || 'all';

    return dashboardsQueryKeys.list({ page, pageSize, search, filter });
  },
  queryFn: async (args: LoaderFunctionArgs) => {
    const url = new URL(args.request.url);

    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const search = url.searchParams.get('search') || undefined;

    const filter =
      (url.searchParams.get('filter') as 'all' | 'owned' | 'shared') || 'all';

    return dashboardsLoader({ page, pageSize, search, filter });
  },
  staleTime: 30 * 1000, // 30 seconds
});

/**
 * Bridge-powered loader for a single dashboard
 */
export const dashboardBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { dashboardId } = DashboardParamsSchema.parse(args.params);

    return dashboardsQueryKeys.dashboard(dashboardId);
  },
  queryFn: async ({ params }) => {
    const { dashboardId } = DashboardParamsSchema.parse(params);

    return dashboardLoader({ dashboardId });
  },
  staleTime: 15 * 1000, // 15 seconds
});

/**
 * Bridge-powered loader for widget data
 */
export const widgetDataBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const { widgetId } = WidgetParamsSchema.parse(args.params);

    return dashboardsQueryKeys.widgetData(widgetId);
  },
  queryFn: async ({ params }) => {
    const { widgetId } = WidgetParamsSchema.parse(params);

    return widgetDataLoader({ widgetId });
  },
  staleTime: 10 * 1000, // 10 seconds
});

/**
 * Bridge-powered loader for searching dashboards
 */
export const searchDashboardsBridgeLoader = createLoader({
  queryKey: (args: LoaderFunctionArgs) => {
    const url = new URL(args.request.url);
    const query = url.searchParams.get('q') || '';

    return dashboardsQueryKeys.search(query);
  },
  queryFn: async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    return searchDashboardsLoader({ query });
  },
  staleTime: 30 * 1000, // 30 seconds
});
