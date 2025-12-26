import { useCallback } from 'react';

import { TZDate } from '@date-fns/tz';

import { useAccountPreferences } from './use-account-preferences';

/**
 * Get the date using the account timezone
 */
export function useGetDate() {
  const [state] = useAccountPreferences();
  const { timezone } = state;

  return useCallback(
    (date: Date) => {
      if (timezone) {
        // If the timezone is set, we need to use the TZDate class to format the date
        // This is because date-fns does not support timezones out of the box
        // and we need to use a library like date-fns-tz to handle this
        return new TZDate(date, timezone);
      }

      // If the timezone is not set, we can use the default date-fns formatter
      return date;
    },
    [timezone],
  );
}
