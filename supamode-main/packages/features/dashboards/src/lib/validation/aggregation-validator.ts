/**
 * Aggregation validation utilities to ensure proper column-aggregation combinations
 */
import type { ColumnMetadata } from '@kit/types';

export interface AggregationValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface AggregationConfig {
  aggregation: string;
  metric: string;
  columns?: ColumnMetadata[];
}

/**
 * Validates that an aggregation configuration is valid
 */
export function validateAggregationConfig(
  config: AggregationConfig,
): AggregationValidationResult {
  const { aggregation, metric, columns = [] } = config;

  // Handle null/undefined aggregation
  if (!aggregation) {
    return {
      isValid: false,
      error: 'Aggregation type is required.',
      suggestion: 'Please select an aggregation function.',
    };
  }

  // COUNT(*) is always valid
  if (aggregation.toLowerCase() === 'count') {
    if (metric === '*' || metric === '') {
      return { isValid: true };
    }

    // COUNT can also work with specific columns
    return { isValid: true };
  }

  // For non-COUNT aggregations, we need a specific column (not *)
  if (metric === '*' || metric === '') {
    return {
      isValid: false,
      error: `${aggregation.toUpperCase()} requires a specific column. You cannot ${aggregation.toLowerCase()} all columns (*).`,
      suggestion:
        'Please select a specific numeric column to perform this aggregation on.',
    };
  }

  // Check if the selected column exists and is numeric
  if (columns.length > 0) {
    const selectedColumn = columns.find((col) => col.name === metric);

    if (!selectedColumn) {
      return {
        isValid: false,
        error: `Column "${metric}" not found in the selected table.`,
        suggestion: 'Please select a valid column from the available options.',
      };
    }

    // Check if column is numeric for mathematical aggregations
    if (['sum', 'avg', 'min', 'max'].includes(aggregation.toLowerCase())) {
      const numericTypes = [
        'integer',
        'bigint',
        'numeric',
        'real',
        'double precision',
        'decimal',
        'smallint',
        'money',
      ];

      const isNumeric = selectedColumn.ui_config?.data_type
        ? numericTypes.includes(selectedColumn.ui_config.data_type)
        : false;

      if (!isNumeric) {
        const dataType = selectedColumn.ui_config?.data_type || 'unknown';
        return {
          isValid: false,
          error: `Cannot perform ${aggregation.toUpperCase()} on non-numeric column "${metric}" (type: ${dataType}).`,
          suggestion:
            'Please select a numeric column for mathematical aggregations, or use COUNT to count records.',
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Gets user-friendly aggregation function names
 */
export function getAggregationDisplayName(aggregation: string): string {
  if (!aggregation) {
    return '';
  }

  const displayNames: Record<string, string> = {
    count: 'Count records',
    sum: 'Add up values',
    avg: 'Calculate average',
    min: 'Find minimum value',
    max: 'Find maximum value',
  };

  return displayNames[aggregation.toLowerCase()] || aggregation.toUpperCase();
}

/**
 * Suggests the appropriate metric value based on aggregation type
 */
export function suggestMetricForAggregation(
  aggregation: string,
  columns: ColumnMetadata[],
): string {
  if (!aggregation || aggregation.toLowerCase() === 'count') {
    return '*';
  }

  // For other aggregations, suggest the first numeric column
  const numericTypes = [
    'integer',
    'bigint',
    'numeric',
    'real',
    'double precision',
    'decimal',
    'smallint',
    'money',
  ];

  const numericColumn = columns.find((col) =>
    col.ui_config?.data_type
      ? numericTypes.includes(col.ui_config.data_type)
      : false,
  );

  return numericColumn?.name || '';
}

/**
 * Auto-corrects invalid aggregation configurations
 */
export function autoCorrectAggregationConfig(
  config: AggregationConfig,
): AggregationConfig {
  const validation = validateAggregationConfig(config);

  if (validation.isValid) {
    return config;
  }

  // If trying to use non-COUNT aggregation with *, convert to COUNT
  if (
    config.metric === '*' &&
    config.aggregation &&
    config.aggregation.toLowerCase() !== 'count'
  ) {
    return {
      ...config,
      aggregation: 'count',
      metric: '*',
    };
  }

  // If no valid column selected for non-COUNT, suggest appropriate column
  if (
    config.aggregation &&
    config.aggregation.toLowerCase() !== 'count' &&
    (!config.metric || config.metric === '*')
  ) {
    const suggestedMetric = suggestMetricForAggregation(
      config.aggregation,
      config.columns || [],
    );

    if (suggestedMetric) {
      return {
        ...config,
        metric: suggestedMetric,
      };
    }

    // Fallback to COUNT if no numeric columns available
    return {
      ...config,
      aggregation: 'count',
      metric: '*',
    };
  }

  return config;
}
