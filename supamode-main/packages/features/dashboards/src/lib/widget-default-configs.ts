import { z } from 'zod';

import type { WidgetType } from '../types';
import type {
  ChartWidgetConfigSchema,
  MetricWidgetConfigSchema,
  TableWidgetConfigSchema,
} from '../types/widget-forms';

/**
 * Default configuration values for Chart widgets
 */
export const defaultChartConfig: z.infer<typeof ChartWidgetConfigSchema> = {
  chartType: 'bar',
  showLegend: true,
  colorScheme: 'default',
  seriesColors: {},
  showGrid: true,
  xAxis: '',
  yAxis: '',
  groupBy: undefined,
  aggregation: 'sum',
  timeAggregation: 'day',
  dateRange: undefined,
  multiSeries: {
    enabled: false,
    groupByColumns: [],
    seriesType: 'grouped',
    maxSeries: 10,
  },
  filters: [],
  orderBy: [],
  limit: 100,
  offset: 0,
};

/**
 * Default configuration values for Metric widgets
 */
export const defaultMetricConfig: z.infer<typeof MetricWidgetConfigSchema> = {
  title: '',
  format: 'number',
  showTrend: false,
  suffix: '',
  prefix: '',
  metric: '',
  aggregation: 'count',
  filters: [],
};

/**
 * Default configuration values for Table widgets
 */
export const defaultTableConfig: z.infer<typeof TableWidgetConfigSchema> = {
  title: '',
  showPagination: true,
  pageSize: 10,
  showSearch: true,
  sortBy: '',
  sortDirection: 'asc',
  refreshInterval: undefined,
  columns: [],
  filters: [],
  orderBy: [],
  limit: 100,
  offset: 0,
};

/**
 * Get default configuration for a specific widget type
 */
export function getDefaultWidgetConfig(widgetType: WidgetType) {
  switch (widgetType) {
    case 'chart':
      return defaultChartConfig;

    case 'metric':
      return defaultMetricConfig;

    case 'table':
      return defaultTableConfig;

    default:
      return {};
  }
}

/**
 * Get default form data for widget wizard initialization
 */
export function getDefaultWidgetFormData(widgetType?: WidgetType) {
  return {
    title: '',
    description: null,
    type: widgetType,
    schemaName: '',
    tableName: '',
    config: widgetType ? getDefaultWidgetConfig(widgetType) : {},
  };
}
