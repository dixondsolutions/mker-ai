import { useMemo } from 'react';

import { getAvailableFormatters } from '../format-value';

/**
 * Formatter option for UI components
 */
export interface FormatterOption {
  name: string;
  type: string;
  label: string;
  description?: string;
  category?: 'number' | 'date' | 'text' | 'custom' | 'other';
}

/**
 * Hook to get available formatters for a specific data type
 *
 * @param dataType - The data type to get formatters for
 * @returns Array of formatter options suitable for UI components
 */
export function useFormatterOptions(dataType?: string): FormatterOption[] {
  return useMemo(() => {
    const availableFormatters = getAvailableFormatters(dataType);

    return availableFormatters.map((formatter) => ({
      name: formatter.name,
      type: formatter.type,
      label: formatFormatterLabel(formatter.name),
      description: getFormatterDescription(formatter.name),
      category: getFormatterCategory(formatter.type),
    }));
  }, [dataType]);
}

/**
 * Convert formatter name to user-friendly label
 */
function formatFormatterLabel(name: string): string {
  // Convert snake_case or kebab-case to Title Case
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get description for a formatter
 */
function getFormatterDescription(name: string): string {
  const descriptions: Record<string, string> = {
    number: 'Format as a regular number with commas',
    currency: 'Format as currency with symbol',
    percentage: 'Format as percentage with % symbol',
    decimal: 'Format with specific decimal places',
    compact: 'Format large numbers as 1.2K, 1.2M, etc.',
    scientific: 'Format in scientific notation (1.23e+6)',
    engineering: 'Format in engineering notation',
    date: 'Format as a date',
    time: 'Format as time',
    datetime: 'Format as date and time',
    relative: 'Format as relative time (2 days ago)',
    text: 'Display as plain text',
    boolean: 'Format true/false values',
    email: 'Format and validate email addresses',
    url: 'Format and validate URLs',
    phone: 'Format phone numbers',
  };

  return descriptions[name] || `Format using ${formatFormatterLabel(name)}`;
}

/**
 * Get category for a formatter type
 */
function getFormatterCategory(type: string): FormatterOption['category'] {
  const numberTypes = [
    'integer',
    'bigint',
    'numeric',
    'real',
    'double precision',
    'decimal',
  ];
  const dateTypes = ['date', 'timestamp', 'timestamptz', 'time'];
  const textTypes = ['text', 'varchar', 'char', 'uuid'];

  if (numberTypes.includes(type)) return 'number';
  if (dateTypes.includes(type)) return 'date';
  if (textTypes.includes(type)) return 'text';

  return 'other';
}
