import { useCallback } from 'react';

import { TZDate } from '@date-fns/tz';
import type { FormatDateOptions } from 'date-fns';
import { format as dateFormatter } from 'date-fns';

import { useAccountPreferences } from '@kit/shared/hooks';

/**
 * Use date formatter
 * @returns The date formatter function. Takes into account the account timezone automatically.
 */
export function useDateFormatter() {
  const [state] = useAccountPreferences();
  const { timezone } = state;

  return useCallback(
    (
      date: Date,
      format = 'LLL, dd MMM yyyy',
      options: FormatDateOptions = {},
    ) => {
      // handle gracefully if the date is invalid
      if (date.toString() === 'Invalid Date') {
        return '-';
      }

      if (timezone) {
        // If the timezone is set, we need to use the TZDate class to format the date
        // This is because date-fns does not support timezones out of the box
        // and we need to use a library like date-fns-tz to handle this
        const tzDate = new TZDate(date, timezone);

        return dateFormatter(tzDate, format, {
          ...options,
        });
      }

      // If the timezone is not set, we can use the default date-fns formatter
      return dateFormatter(date, format, {
        ...options,
      });
    },
    [timezone],
  );
}
