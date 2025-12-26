/**
 * Metric Trend Calculator
 *
 * Handles calculating trend data for metric widgets by comparing current and previous periods.
 * Separated from the widgets service for better testability and reusability.
 */
import type { Context } from 'hono';

import { createTableQueryService } from '@kit/data-explorer-core';
import type { FilterCondition } from '@kit/filters-core';

import type { AdvancedFilterCondition } from '../types';
import { adaptFiltersForBackend } from './filters/dashboard-filter-adapter';
import { calculateTrendPercentage } from './trend-calculation';
import { parseTrendFilters } from './trend-filter-parser';
import { WidgetQueryBuilder } from './widget-query-builder';

export interface MetricTrendInput {
  widget: {
    id: string;
    schemaName: string;
    tableName: string;
    widgetType: string;
  };
  rawConfig: Record<string, unknown>;
  pagination?: { page: number; pageSize: number };
  context: Context;
}

export interface MetricTrendResult {
  data: Array<{
    value: string;
    previousValue: string;
    trendPercentage: number;
    trend: 'up' | 'down' | 'stable';
    previousPeriodStart: string;
    previousPeriodEnd: string;
  }>;
  metadata: {
    totalCount: number;
    pageCount: number;
    lastUpdated: string;
    trendFilters: Array<{
      column: string;
      operator: string;
      value: unknown;
      config?: Record<string, unknown>;
    }>;
    trendDateColumns: string[];
    currentPeriod: {
      start: string;
      end: string;
    };
    previousPeriod: {
      start: string;
      end: string;
    };
  };
}

/**
 * Calculate metric trend data by comparing current and previous periods
 */
export async function calculateMetricTrend(
  input: MetricTrendInput,
): Promise<MetricTrendResult> {
  const { widget, rawConfig, pagination, context } = input;

  const tableQuery = createTableQueryService(context);

  // Get current filters, separating trend filters from regular filters
  const rawFilters = (rawConfig['filters'] as AdvancedFilterCondition[]) || [];

  const trendFilters = rawFilters.filter((f) => f.config?.['isTrendFilter']);
  const regularFilters = rawFilters.filter((f) => !f.config?.['isTrendFilter']);

  // Parse trend filters to get current and previous periods
  const { currentPeriod, previousPeriod, trendColumn } =
    parseTrendFilters(trendFilters);

  const { start: currentStart, end: currentEnd } = currentPeriod;
  const { start: previousStart, end: previousEnd } = previousPeriod;

  // Convert config for query builder (without trend filters for base query)
  const configWithoutTrendFilters = {
    ...rawConfig,
    filters: regularFilters,
  };

  const config = adaptConfigForQueryBuilder(configWithoutTrendFilters);

  // Build base query parameters
  const baseQueryParams = WidgetQueryBuilder.buildQueryParams(
    widget,
    config,
    pagination,
  );

  // Get regular filters (excluding trend filters)
  const existingFilters = adaptFiltersForBackend(regularFilters);

  // Create period filters
  const currentPeriodFilter: FilterCondition = {
    column: trendColumn,
    operator: 'between',
    value: `${currentStart.toISOString()},${currentEnd.toISOString()}`,
  };

  const previousPeriodFilter: FilterCondition = {
    column: trendColumn,
    operator: 'between',
    value: `${previousStart.toISOString()},${previousEnd.toISOString()}`,
  };

  // Execute queries for both periods
  const [currentResult, previousResult] = await Promise.all([
    tableQuery.queryTableData({
      ...baseQueryParams,
      filters: [...existingFilters, currentPeriodFilter],
    }),
    tableQuery.queryTableData({
      ...baseQueryParams,
      filters: [...existingFilters, previousPeriodFilter],
    }),
  ]);

  // Extract metric values
  const { extractMetricValue } = await import('./trend-calculator');
  const currentValue = extractMetricValue(currentResult.data || []);
  const previousValue = extractMetricValue(previousResult.data || []);

  // Calculate trend
  const { trendPercentage, trendDirection } = calculateTrendPercentage(
    currentValue,
    previousValue,
  );

  // Return structured result
  return {
    data: [
      {
        value: currentValue.toString(),
        previousValue: previousValue.toString(),
        trendPercentage: Math.round(trendPercentage * 100) / 100, // Round to 2 decimal places
        trend: trendDirection,
        previousPeriodStart: previousStart.toISOString(),
        previousPeriodEnd: previousEnd.toISOString(),
      },
    ],
    metadata: {
      totalCount: 1,
      pageCount: 1,
      lastUpdated: new Date().toISOString(),
      // Include trend filter metadata for frontend processing (only the first one used)
      trendFilters: trendFilters.slice(0, 1).map((f) => ({
        column: f.column,
        operator: f.operator,
        value: f.value,
        config: f.config,
      })),
      // Include detected date columns for trend analysis
      trendDateColumns: [trendColumn],
      // Include period information for debugging
      currentPeriod: {
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
      previousPeriod: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
    },
  };
}

/**
 * Convert dashboard config to query builder format
 * Handles AdvancedFilterCondition to FilterCondition conversion
 */
function adaptConfigForQueryBuilder(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const adaptedConfig = { ...config };

  // Convert AdvancedFilterCondition[] to FilterCondition[] if present
  if (config['filters'] && Array.isArray(config['filters'])) {
    adaptedConfig['filters'] = adaptFiltersForBackend(
      config['filters'] as AdvancedFilterCondition[],
    );
  }

  return adaptedConfig;
}
