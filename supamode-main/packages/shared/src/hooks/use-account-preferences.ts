import { useState } from 'react';

import { useRouteLoaderData } from 'react-router';

/**
 * Use account preferences
 * @returns The account preferences
 */
export function useAccountPreferences() {
  const data = useRouteLoaderData('app-root');

  const [state, setState] = useState<{
    language: string;
    timezone: string;
  }>(data.preferences);

  // Use ref to prevent unnecessary updates when preferences haven't actually changed
  const [lastPreferences, setLastPreferences] = useState(data.preferences);

  // Only update state if preferences have actually changed
  const newPreferences = data.preferences;

  if (
    newPreferences.language !== lastPreferences.language ||
    newPreferences.timezone !== lastPreferences.timezone
  ) {
    setState(newPreferences);
    setLastPreferences(newPreferences);
  }

  return [state, setState] as const;
}
