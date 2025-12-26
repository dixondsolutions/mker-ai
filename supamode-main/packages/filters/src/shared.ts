import { useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import { FilterItem } from './types';

/**
 * Get the filter options
 * @param filter - The filter
 * @returns The filter options
 */
export function useGetFilterOptions(filter: FilterItem) {
  const { t } = useTranslation();

  return useCallback(() => {
    // For boolean type
    if (filter.ui_config.data_type === 'boolean') {
      return [
        { label: t('dataExplorer:filters.true'), value: true },
        { label: t('dataExplorer:filters.false'), value: false },
      ];
    }

    const enumValues = filter.ui_config.enum_values;

    // For enum values (if provided through props)
    if (enumValues && enumValues.length > 0) {
      return enumValues.map((value) => ({
        label: value,
        value,
      }));
    }

    // Default options for other types
    return [];
  }, [filter, t]);
}

// Helper function to check if a filter has a valid value
export function hasValidValue(filter: FilterItem): boolean {
  if (!filter.values.length) {
    return false;
  }

  const value = filter.values[0]?.value;

  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }

  return true;
}
