import { useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import { getRelativeDateRange as getCentralizedRelativeDateRange } from '@kit/filters-core';
import { useDateFormatter } from '@kit/formatters/hooks';
import { useAccountPreferences, useGetDate } from '@kit/shared/hooks';

import { RELATIVE_DATE_PREFIX } from './constants';
import { RelativeDateOption } from './types';

/**
 * Calculate the actual date range from a relative date option
 */
export function getRelativeDateRange(option: RelativeDateOption): {
  startDate: Date;
  endDate?: Date;
} {
  const centralizedRange = getCentralizedRelativeDateRange(option);

  // Convert the centralized format to the old format for backward compatibility
  return {
    startDate: centralizedRange.start,
    endDate: centralizedRange.end,
  };
}

/**
 * Check if a value is a relative date
 */
export function isRelativeDate(value: unknown) {
  return typeof value === 'string' && value.startsWith(RELATIVE_DATE_PREFIX);
}

/**
 * Extract the relative date option from a value
 */
export function extractRelativeDateOption(value: string) {
  if (isRelativeDate(value)) {
    const option = value.replace(RELATIVE_DATE_PREFIX, '');

    return option as RelativeDateOption;
  }

  return null;
}

/**
 * Format a relative date for display (without applying the actual date calculation)
 */
export function formatRelativeDateForDisplay(
  option: RelativeDateOption,
  t: (value: string) => string,
) {
  return t(`dataExplorer:relativeDates.${option}`);
}

/**
 * Parse a date string
 */
export function parseDate(dateStr: string) {
  if (!dateStr) {
    return undefined;
  }

  const date = new Date(dateStr);

  return !Number.isNaN(date.getTime()) ? date : undefined;
}

/**
 * Get the timezone
 */
export function useTimezone() {
  const [{ timezone }] = useAccountPreferences();

  return timezone;
}

export function useFormatDateForDisplay() {
  const dateFormatter = useDateFormatter();

  return useCallback(
    (date: string | number | Date) => {
      if (date instanceof Date || typeof date === 'string') {
        const d = date instanceof Date ? date : new Date(date);

        if (Number.isNaN(d.getTime())) {
          return 'Invalid date';
        }

        return dateFormatter(d, 'LLL dd, yyyy');
      }

      return 'Invalid date';
    },
    [dateFormatter],
  );
}

/**
 * Format a timestamp
 */
export function useFormatTimestamp() {
  const formatDateForDisplay = useFormatDateForDisplay();
  const createDate = useGetDate();
  const { t } = useTranslation();

  return useCallback(
    (date: Date) => {
      const now = createDate(new Date());
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return t('dataExplorer:filters.today');
      }

      return formatDateForDisplay(date);
    },
    [createDate, formatDateForDisplay, t],
  );
}
