/**
 * Trend Filter Date Range Parser
 *
 * Handles parsing trend filters to extract date ranges for trend analysis.
 * Supports both relative dates (__rel_date:option) and absolute date ranges (start,end).
 */
import {
  extractRelativeDateOption,
  getRelativeDateRange,
} from '@kit/filters-core';

import type { AdvancedFilterCondition } from '../types';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TrendFilterParseResult {
  currentPeriod: DateRange;
  previousPeriod: DateRange;
  trendColumn: string;
}

/**
 * Parse trend filters to extract current and previous date ranges for trend analysis
 */
export function parseTrendFilters(
  trendFilters: AdvancedFilterCondition[],
): TrendFilterParseResult {
  if (trendFilters.length === 0) {
    throw new Error('No trend filters provided for trend analysis.');
  }

  // Use first trend filter for trend period calculation
  // Multiple trend filters for a single metric widget don't make logical sense
  const trendFilter = trendFilters[0];
  if (!trendFilter) {
    throw new Error('No valid trend filter found.');
  }

  const currentPeriod = parseTrendFilterDateRange(trendFilter);

  // Calculate previous period (same duration, offset backwards)
  const periodDuration =
    currentPeriod.end.getTime() - currentPeriod.start.getTime();
  const previousPeriod: DateRange = {
    start: new Date(currentPeriod.start.getTime() - periodDuration),
    end: new Date(currentPeriod.start.getTime()),
  };

  return {
    currentPeriod,
    previousPeriod,
    trendColumn: trendFilter.column,
  };
}

/**
 * Parse a single trend filter to extract its date range
 */
export function parseTrendFilterDateRange(
  trendFilter: AdvancedFilterCondition,
): DateRange {
  const dateRangeValue = trendFilter.value as string;

  if (!dateRangeValue || typeof dateRangeValue !== 'string') {
    throw new Error('Trend filter must have a valid string value.');
  }

  // Handle relative date values (e.g., "__rel_date:last7Days")
  if (dateRangeValue.startsWith('__rel_date:')) {
    return parseRelativeDateRange(dateRangeValue);
  }

  // Handle absolute date ranges in "start,end" format
  if (dateRangeValue.includes(',')) {
    return parseAbsoluteDateRange(dateRangeValue);
  }

  throw new Error(
    `Invalid trend filter date range format: "${dateRangeValue}". Expected "__rel_date:option" or "start,end" format.`,
  );
}

/**
 * Parse relative date strings like "__rel_date:last7Days"
 */
export function parseRelativeDateRange(value: string): DateRange {
  const option = extractRelativeDateOption(value);

  if (!option) {
    throw new Error(`Invalid relative date option: ${value}`);
  }

  const range = getRelativeDateRange(option);
  return {
    start: range.start,
    end: range.end,
  };
}

/**
 * Parse absolute date ranges in "start,end" format
 */
export function parseAbsoluteDateRange(value: string): DateRange {
  const [startStr, endStr] = value.split(',').map((s) => s.trim());

  if (!startStr || !endStr) {
    throw new Error(
      'Invalid date range format. Both start and end dates are required.',
    );
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error(`Invalid dates in trend filter range: "${value}"`);
  }

  if (start >= end) {
    throw new Error(
      'Start date must be before end date in trend filter range.',
    );
  }

  return { start, end };
}

/**
 * Validate that a filter has the required trend filter configuration
 */
export function isTrendFilter(filter: AdvancedFilterCondition): boolean {
  return Boolean(filter.config?.['isTrendFilter']);
}

/**
 * Extract only trend filters from a list of filters
 */
export function extractTrendFilters(
  filters: AdvancedFilterCondition[],
): AdvancedFilterCondition[] {
  return filters.filter(isTrendFilter);
}
