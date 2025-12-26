import { formatDistance } from 'date-fns';

import type { DashboardWidget } from '../types';

// Default refresh interval in seconds
const DEFAULT_REFRESH_INTERVAL_SECONDS = 250;

/**
 * Parse the widget config from a string to an object
 * @param widget - The widget to parse the config from
 * @returns The parsed config
 */
export function parseWidgetConfig(widget: DashboardWidget) {
  return typeof widget.config === 'string'
    ? JSON.parse(widget.config)
    : widget.config;
}

/**
 * Get the refresh interval for a widget
 * @param widget - The widget to get the refresh interval for
 * @returns The refresh interval in milliseconds
 */
export function getRefreshInterval(widget: DashboardWidget): number {
  const config = parseWidgetConfig(widget);

  return (config?.refreshInterval || DEFAULT_REFRESH_INTERVAL_SECONDS) * 1000;
}

/**
 * Format the last updated timestamp
 * @param timestamp - The timestamp to format
 * @returns The formatted last updated timestamp
 */
export function formatLastUpdated(timestamp: string) {
  return formatDistance(new Date(timestamp), new Date(), {
    addSuffix: true,
  });
}
