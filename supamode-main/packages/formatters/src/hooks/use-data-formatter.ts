import { useCallback, useMemo } from 'react';

import { useAccountPreferences } from '../../../shared/src/hooks/use-account-preferences';
import {
  type ColumnFormattingConfig,
  DEFAULT_FORMATTER_CONTEXT,
  DataFormatterService,
  type FormattedValue,
  type FormatterConfig,
  type FormatterContext,
} from '../formatters';

/**
 * React hook for using the data formatter service
 * Automatically uses user preferences for locale and timezone
 */
export function useDataFormatter() {
  const [preferences] = useAccountPreferences();

  // Create formatter context from user preferences
  const formatterContext = useMemo(
    (): FormatterContext => ({
      locale: preferences.language || DEFAULT_FORMATTER_CONTEXT.locale,
      timezone: preferences.timezone || DEFAULT_FORMATTER_CONTEXT.timezone,
      currency: DEFAULT_FORMATTER_CONTEXT.currency,
      dateFormat: DEFAULT_FORMATTER_CONTEXT.dateFormat,
      timeFormat: DEFAULT_FORMATTER_CONTEXT.timeFormat,
      numberFormat: DEFAULT_FORMATTER_CONTEXT.numberFormat,
    }),
    [preferences],
  );

  // Create formatter service instance
  const formatter = useMemo(
    () => new DataFormatterService(formatterContext),
    [formatterContext],
  );

  // Format a single value
  const format = useCallback(
    <T = unknown>(value: T, config: FormatterConfig): FormattedValue => {
      return formatter.format(value, config);
    },
    [formatter],
  );

  // Format multiple values
  const formatBatch = useCallback(
    <T = unknown>(
      items: Array<{ value: T; config: FormatterConfig }>,
    ): FormattedValue[] => {
      return formatter.formatBatch(items);
    },
    [formatter],
  );

  // Format by column metadata
  const formatByColumn = useCallback(
    <T = unknown>(
      value: T,
      columnConfig: ColumnFormattingConfig,
    ): FormattedValue => {
      return formatter.formatByColumn(value, columnConfig);
    },
    [formatter],
  );

  // Convenience formatters for common use cases
  const formatNumber = useCallback(
    (
      value: unknown,
      options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
        notation?: 'standard' | 'compact' | 'scientific';
        prefix?: string;
        suffix?: string;
      },
    ): string => {
      const result = formatter.format(value, {
        type: 'number',
        ...options,
      });
      return result.formatted;
    },
    [formatter],
  );

  const formatCurrency = useCallback(
    (
      value: unknown,
      currency?: string,
      options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
      },
    ): string => {
      const result = formatter.format(value, {
        type: 'currency',
        currency: currency || formatterContext.currency,
        ...options,
      });
      return result.formatted;
    },
    [formatter, formatterContext.currency],
  );

  const formatPercentage = useCallback(
    (
      value: unknown,
      options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
      },
    ): string => {
      const result = formatter.format(value, {
        type: 'percentage',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        ...options,
      });
      return result.formatted;
    },
    [formatter],
  );

  const formatDate = useCallback(
    (
      value: unknown,
      options?: {
        type?: 'date' | 'time' | 'datetime' | 'relative';
        dateStyle?: 'full' | 'long' | 'medium' | 'short';
        timeStyle?: 'full' | 'long' | 'medium' | 'short';
        format?: string;
      },
    ): string => {
      const result = formatter.format(value, {
        type: 'date',
        dateStyle: 'medium',
        ...options,
      });
      return result.formatted;
    },
    [formatter],
  );

  const formatText = useCallback(
    (
      value: unknown,
      options?: {
        type?:
          | 'text'
          | 'email'
          | 'url'
          | 'phone'
          | 'truncate'
          | 'capitalize'
          | 'uppercase'
          | 'lowercase';
        maxLength?: number;
        truncatePosition?: 'start' | 'middle' | 'end';
      },
    ): string => {
      const result = formatter.format(value, {
        type: 'text',
        ...options,
      });
      return result.formatted;
    },
    [formatter],
  );

  // Get available formatters for a data type
  const getAvailableFormatters = useCallback(
    (dataType?: string) => {
      return formatter.getAvailableFormatters(dataType);
    },
    [formatter],
  );

  // Infer config from column metadata
  const inferConfigFromColumn = useCallback(
    (columnConfig: ColumnFormattingConfig) => {
      return formatter.inferConfigFromColumn(columnConfig);
    },
    [formatter],
  );

  return {
    // Core formatting functions
    format,
    formatBatch,
    formatByColumn,

    // Convenience formatters
    formatNumber,
    formatCurrency,
    formatPercentage,
    formatDate,
    formatText,

    // Utility functions
    getAvailableFormatters,
    inferConfigFromColumn,

    // Context and service access
    context: formatterContext,
    service: formatter,
  };
}

/**
 * Specialized hook for formatting numbers
 */
export function useNumberFormatter() {
  const { formatNumber, formatCurrency, formatPercentage } = useDataFormatter();

  return {
    formatNumber,
    formatCurrency,
    formatPercentage,

    // Additional number formatting utilities
    formatCompact: useCallback(
      (value: unknown) => formatNumber(value, { notation: 'compact' }),
      [formatNumber],
    ),

    formatInteger: useCallback(
      (value: unknown) => formatNumber(value, { maximumFractionDigits: 0 }),
      [formatNumber],
    ),

    formatDecimal: useCallback(
      (value: unknown, decimalPlaces = 2) =>
        formatNumber(value, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }),
      [formatNumber],
    ),
  };
}

/**
 * Specialized hook for formatting dates
 */
export function useDateFormatterEnhanced() {
  const { formatDate } = useDataFormatter();

  return {
    formatDate,

    // Additional date formatting utilities
    formatDateShort: useCallback(
      (value: unknown) => formatDate(value, { dateStyle: 'short' }),
      [formatDate],
    ),

    formatDateLong: useCallback(
      (value: unknown) => formatDate(value, { dateStyle: 'long' }),
      [formatDate],
    ),

    formatDateTime: useCallback(
      (value: unknown) =>
        formatDate(value, {
          type: 'datetime',
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      [formatDate],
    ),

    formatTimeOnly: useCallback(
      (value: unknown) =>
        formatDate(value, { type: 'time', timeStyle: 'short' }),
      [formatDate],
    ),

    formatRelative: useCallback(
      (value: unknown) => formatDate(value, { type: 'relative' }),
      [formatDate],
    ),
  };
}
