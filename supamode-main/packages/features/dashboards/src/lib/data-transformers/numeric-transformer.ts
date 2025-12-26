/**
 * Numeric Data Type Transformer
 *
 * Provides client-side defensive programming for numeric data conversion.
 * Handles edge cases where PostgreSQL aggregations return strings instead of numbers.
 *
 * Design Principles:
 * 1. Server-side SQL casting should be the primary solution (PostgreSQL ::numeric)
 * 2. Client-side transformation is defensive programming for edge cases
 * 3. Type safety and performance are prioritized
 * 4. Comprehensive error handling and validation
 */

export interface NumericTransformationOptions {
  /** Fields to transform to numbers. Default: ['value'] */
  numericFields?: string[];
  /** Whether to preserve original values in __raw field */
  preserveRaw?: boolean;
  /** Default value for invalid numbers */
  defaultValue?: number;
  /** Whether to log warnings for conversion issues */
  logWarnings?: boolean;
}

export interface TransformationResult<T = unknown> {
  /** Transformed data */
  data: T[];
  /** Transformation statistics */
  stats: {
    totalRecords: number;
    transformedFields: number;
    stringToNumberConversions: number;
    invalidConversions: number;
    skippedRecords: number;
  };
  /** Warnings encountered during transformation */
  warnings: string[];
}

/**
 * Core numeric transformation utilities
 */
export class NumericTransformer {
  private static readonly DEFAULT_OPTIONS: Required<NumericTransformationOptions> =
    {
      numericFields: ['value'],
      preserveRaw: false,
      defaultValue: 0,
      logWarnings: true,
    };

  /**
   * Transform widget data to ensure numeric types for aggregation fields
   */
  static transformWidgetData<T extends Record<string, unknown>>(
    data: T[],
    options: NumericTransformationOptions = {},
  ): TransformationResult<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const stats = {
      totalRecords: data.length,
      transformedFields: 0,
      stringToNumberConversions: 0,
      invalidConversions: 0,
      skippedRecords: 0,
    };
    const warnings: string[] = [];

    const transformedData = data.map((record, index) => {
      if (!this.isValidRecord(record)) {
        stats.skippedRecords++;
        warnings.push(
          `Skipped invalid record at index ${index}: not an object`,
        );
        return record;
      }

      const transformed = { ...record };

      for (const field of opts.numericFields) {
        if (!(field in record)) {
          continue; // Field doesn't exist, skip
        }

        const result = this.transformField(record[field], field, index, opts);

        if (result.transformed) {
          if (result.wasString) {
            stats.stringToNumberConversions++;
          }

          if (result.wasInvalid) {
            stats.invalidConversions++;
          }

          stats.transformedFields++;

          // Apply transformation
          (transformed as Record<string, unknown>)[field] = result.value;

          // Preserve raw value if requested
          if (opts.preserveRaw && result.wasString) {
            (transformed as Record<string, unknown>)[`__raw_${field}`] =
              record[field];
          }
        }

        // Collect warnings
        if (result.warning) {
          warnings.push(result.warning);
        }
      }

      return transformed;
    });

    // Log consolidated warnings
    if (opts.logWarnings && warnings.length > 0) {
      console.warn(
        `NumericTransformer: ${warnings.length} transformation issues encountered`,
        { summary: stats, warnings: warnings.slice(0, 5) }, // Log first 5 warnings
      );
    }

    return {
      data: transformedData,
      stats,
      warnings,
    };
  }

  /**
   * Transform a single field value to numeric type
   */
  private static transformField(
    value: unknown,
    fieldName: string,
    recordIndex: number,
    options: Required<NumericTransformationOptions>,
  ): {
    value: number;
    transformed: boolean;
    wasString: boolean;
    wasInvalid: boolean;
    warning?: string;
  } {
    // Already a number - no transformation needed
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return {
          value: options.defaultValue,
          transformed: true,
          wasString: false,
          wasInvalid: true,
          warning: `Field '${fieldName}' at record ${recordIndex}: Invalid number (${value}), using default`,
        };
      }
      return {
        value,
        transformed: false,
        wasString: false,
        wasInvalid: false,
      };
    }

    // String conversion
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed === '') {
        return {
          value: options.defaultValue,
          transformed: true,
          wasString: true,
          wasInvalid: true,
          warning: `Field '${fieldName}' at record ${recordIndex}: Empty string, using default`,
        };
      }

      const parsed = this.parseNumericString(trimmed);

      if (parsed.isValid) {
        return {
          value: parsed.value,
          transformed: true,
          wasString: true,
          wasInvalid: false,
        };
      } else {
        return {
          value: options.defaultValue,
          transformed: true,
          wasString: true,
          wasInvalid: true,
          warning: `Field '${fieldName}' at record ${recordIndex}: Cannot parse '${trimmed}' as number, using default`,
        };
      }
    }

    // Null/undefined - use default
    if (value == null) {
      return {
        value: options.defaultValue,
        transformed: true,
        wasString: false,
        wasInvalid: true,
        warning: `Field '${fieldName}' at record ${recordIndex}: Null/undefined value, using default`,
      };
    }

    // Other types (boolean, object, etc.)
    return {
      value: options.defaultValue,
      transformed: true,
      wasString: false,
      wasInvalid: true,
      warning: `Field '${fieldName}' at record ${recordIndex}: Unsupported type (${typeof value}), using default`,
    };
  }

  /**
   * Parse a string to number with comprehensive validation
   */
  private static parseNumericString(str: string): {
    value: number;
    isValid: boolean;
  } {
    // Handle common PostgreSQL numeric formats
    const cleanStr = str
      .replace(/,/g, '') // Remove thousands separators
      .replace(/^\$/, '') // Remove currency symbols
      .trim();

    // Use parseFloat for flexibility, then validate
    const parsed = parseFloat(cleanStr);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      return { value: 0, isValid: false };
    }

    // Additional validation: ensure the entire string was consumed
    // This catches cases like "123abc" where parseFloat returns 123
    const stringifiedBack = String(parsed);
    const normalizedInput = cleanStr.replace(/\.0+$/, ''); // Remove trailing zeros
    const normalizedOutput = stringifiedBack.replace(/\.0+$/, '');

    // Allow for minor floating point representation differences
    if (normalizedInput !== normalizedOutput && cleanStr !== stringifiedBack) {
      // Try one more validation - parse as integer if it looks like one
      if (/^\d+$/.test(cleanStr)) {
        const intParsed = parseInt(cleanStr, 10);
        if (String(intParsed) === cleanStr) {
          return { value: intParsed, isValid: true };
        }
      }
      return { value: parsed, isValid: false };
    }

    return { value: parsed, isValid: true };
  }

  /**
   * Check if a record is valid for transformation
   */
  private static isValidRecord(
    record: unknown,
  ): record is Record<string, unknown> {
    return (
      typeof record === 'object' && record !== null && !Array.isArray(record)
    );
  }

  /**
   * Get aggregation fields from widget configuration
   * Used to automatically determine which fields should be numeric
   */
  static getAggregationFields(config: {
    aggregation?: string;
    yAxis?: string;
    groupBy?: string;
  }): string[] {
    const fields: string[] = [];

    // Primary aggregation result field
    if (config.aggregation) {
      fields.push('value'); // Standard aggregation alias
    }

    // Specific column aggregations
    if (config.yAxis && config.yAxis !== '*') {
      fields.push(config.yAxis);
    }

    // Common aggregation column patterns
    const commonAggregationFields = [
      'count',
      'sum',
      'avg',
      'average',
      'min',
      'max',
      'total',
      'amount',
      'quantity',
      'price',
      'revenue',
      'score',
      'rating',
      'percentage',
      'ratio',
    ];

    fields.push(...commonAggregationFields);

    return [...new Set(fields)]; // Remove duplicates
  }

  /**
   * Transform chart data specifically for Recharts compatibility
   */
  static transformChartData<T extends Record<string, unknown>>(
    data: T[],
    config: {
      yAxis?: string;
      aggregation?: string;
      groupBy?: string;
    },
  ): TransformationResult<T> {
    const numericFields = this.getAggregationFields(config);

    return this.transformWidgetData(data, {
      numericFields,
      preserveRaw: false, // Charts don't need raw values
      defaultValue: 0, // Charts can handle 0 as missing data
      logWarnings: true,
    });
  }

  /**
   * Validate transformation results
   */
  static validateTransformation<T>(result: TransformationResult<T>): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (result.stats.invalidConversions > 0) {
      issues.push(
        `${result.stats.invalidConversions} invalid numeric conversions`,
      );
    }

    if (result.stats.skippedRecords > 0) {
      issues.push(`${result.stats.skippedRecords} records skipped`);
    }

    const conversionRate =
      result.stats.totalRecords > 0
        ? result.stats.transformedFields / result.stats.totalRecords
        : 0;

    if (conversionRate < 0.1 && result.stats.totalRecords > 0) {
      issues.push(
        `Low transformation rate: ${(conversionRate * 100).toFixed(1)}%`,
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
