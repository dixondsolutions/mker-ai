/**
 * Query keys for dashboards feature
 */
export const dashboardsQueryKeys = {
  all: () => ['dashboards'] as const,
  list: (params: {
    page: number;
    pageSize: number;
    search?: string;
    filter: 'all' | 'owned' | 'shared';
  }) => ['dashboards', 'list', params] as const,
  dashboard: (id: string) => ['dashboards', 'detail', id] as const,
  search: (query: string) => ['dashboards', 'search', query] as const,
  widgetData: (widgetId: string) =>
    ['dashboards', 'widget', widgetId, 'data'] as const,
  widgets: (dashboardId: string) =>
    ['dashboards', dashboardId, 'widgets'] as const,
} as const;
