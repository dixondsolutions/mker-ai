import { useQuery } from '@tanstack/react-query';

import {
  areVersionsEqual,
  cleanupDismissedVersions,
  isVersionComparisonDismissed,
  shouldSkipVersionCheck,
  updateLastVersionCheck,
} from '@kit/shared/utils';

/**
 * Version check types
 */
export type VersionCheckType = 'external' | 'server-sync';

/**
 * Version check data returned by hooks
 */
export interface VersionCheckData {
  type: VersionCheckType;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  lastChecked: number;
}

/**
 * Configuration for version checkers
 * Allows dependency injection for testing
 */
export interface VersionCheckerConfig {
  /** Function to get current version from DOM */
  getCurrentVersion?: () => string;
  /** Function to fetch data */
  fetcher?: typeof fetch;
  /** Check interval in seconds */
  checkInterval?: number;
  /** Enable version checking */
  enabled?: boolean;
  /** Development mode flag */
  isDevelopment?: boolean;
  /** External API URL */
  externalApiUrl?: string;
  /** Server API URL */
  serverApiUrl?: string;
}

const fetcher = window.fetch.bind(window);

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VersionCheckerConfig> = {
  getCurrentVersion: () =>
    document.documentElement.getAttribute('data-version') ?? '0.0.0',
  fetcher,
  checkInterval: 3600, // 1 hour
  enabled:
    typeof window !== 'undefined' &&
    import.meta.env['VITE_ENABLE_VERSION_CHECK'] === 'true',
  isDevelopment:
    typeof window !== 'undefined' && import.meta.env['MODE'] === 'development',
  externalApiUrl:
    typeof window !== 'undefined'
      ? (import.meta.env['VITE_VERSION_API_URL'] ??
        'https://makerkit.dev/api/versions')
      : '',
  serverApiUrl: '/api/v1/version',
};

/**
 * Merge user config with defaults
 */
function mergeConfig(
  config?: VersionCheckerConfig,
): Required<VersionCheckerConfig> {
  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

/**
 * Hook to check server version for client/server sync
 * Checks every 30 seconds to detect when server has been updated
 */
export function useServerSyncChecker(config?: VersionCheckerConfig) {
  const mergedConfig = mergeConfig(config);

  return useQuery({
    queryKey: ['server-sync-checker', mergedConfig.serverApiUrl],
    staleTime: 30_000, // Check every 30 seconds
    gcTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    retry: 1,
    enabled: mergedConfig.enabled,
    queryFn: async (): Promise<VersionCheckData | null> => {
      try {
        const currentVersion = mergedConfig.getCurrentVersion();

        const response = await mergedConfig.fetcher(mergedConfig.serverApiUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as { version: string };
        const serverVersion = data.version;

        const hasUpdate =
          !areVersionsEqual(currentVersion, serverVersion) &&
          currentVersion !== '0.0.0' &&
          serverVersion !== '0.0.0';

        return {
          type: 'server-sync',
          currentVersion,
          latestVersion: serverVersion,
          hasUpdate,
          lastChecked: Date.now(),
        };
      } catch (error) {
        console.warn('Failed to check server version:', error);
        return null;
      }
    },
  });
}

/**
 * Hook to check external version updates (e.g., from upstream)
 * Checks based on configured interval (default 1 hour)
 */
export function useExternalVersionChecker(config?: VersionCheckerConfig) {
  const mergedConfig = mergeConfig(config);

  return useQuery({
    queryKey: ['external-version-checker', mergedConfig.externalApiUrl],
    staleTime: mergedConfig.checkInterval * 1000,
    gcTime: mergedConfig.checkInterval * 1000 * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
    retry: 1,
    enabled:
      mergedConfig.enabled &&
      !mergedConfig.isDevelopment &&
      !shouldSkipVersionCheck(mergedConfig.checkInterval),
    queryFn: async (): Promise<VersionCheckData | null> => {
      try {
        const currentVersion = mergedConfig.getCurrentVersion();

        const response = await mergedConfig.fetcher(
          mergedConfig.externalApiUrl,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as { supamode: string };
        const latestVersion = data.supamode;

        // Update check timestamp
        updateLastVersionCheck();

        // Clean up old dismissed versions
        cleanupDismissedVersions(currentVersion, latestVersion);

        const versionsDiffer =
          !areVersionsEqual(currentVersion, latestVersion) &&
          currentVersion !== '0.0.0' &&
          latestVersion !== '0.0.0';

        // Check if this comparison was dismissed
        const wasDismissed = isVersionComparisonDismissed(
          currentVersion,
          latestVersion,
        );

        const hasUpdate = versionsDiffer && !wasDismissed;

        return {
          type: 'external',
          currentVersion,
          latestVersion,
          hasUpdate,
          lastChecked: Date.now(),
        };
      } catch (error) {
        console.warn('Failed to check for external version updates:', error);

        // Update timestamp even on error to avoid frequent retries
        updateLastVersionCheck();

        return null;
      }
    },
  });
}
