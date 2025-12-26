import type { ReactNode } from 'react';

import type { VersionStorage } from '@kit/shared/utils';

import type {
  MockVersionUpdaterContextValue,
  VersionCheckerConfig,
} from './index';
import { VersionUpdaterProvider } from './version-updater-context';

/**
 * Create a mock storage for testing
 * Provides in-memory storage implementation
 */
export function createMockVersionStorage(): VersionStorage {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
}

/**
 * Create a mock fetch function for testing
 */
export function createMockFetch(
  responses: Record<string, unknown>,
): typeof fetch {
  return async (url: RequestInfo | URL) => {
    const urlString = url.toString();
    const data = responses[urlString];

    if (!data) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      json: async () => data,
    } as Response;
  };
}

/**
 * Mock version updater provider for testing
 * Disables real version checking and uses mock data
 *
 * @example
 * ```tsx
 * import { render } from '@testing-library/react';
 * import { MockVersionUpdaterProvider } from './test-utils';
 *
 * test('shows server sync dialog', () => {
 *   const { getByText } = render(
 *     <MockVersionUpdaterProvider
 *       serverSyncData={{
 *         type: 'server-sync',
 *         currentVersion: '1.0.0',
 *         latestVersion: '1.1.0',
 *         hasUpdate: true,
 *         lastChecked: Date.now(),
 *       }}
 *     >
 *       <YourComponent />
 *     </MockVersionUpdaterProvider>
 *   );
 *
 *   expect(getByText(/client.*server.*out of sync/i)).toBeInTheDocument();
 * });
 * ```
 */
export function MockVersionUpdaterProvider({
  children,
  ...mockValue
}: MockVersionUpdaterContextValue & { children: ReactNode }) {
  return (
    <VersionUpdaterProvider mockValue={{ ...mockValue, mock: true }}>
      {children}
    </VersionUpdaterProvider>
  );
}

/**
 * Create a testable version checker config
 * Allows overriding all external dependencies
 *
 * @example
 * ```tsx
 * import { createTestVersionConfig, createMockFetch } from './test-utils';
 *
 * const config = createTestVersionConfig({
 *   getCurrentVersion: () => '1.0.0',
 *   fetcher: createMockFetch({
 *     '/api/v1/version': { version: '1.1.0' },
 *     'https://makerkit.dev/api/versions': { supamode: '1.2.0' },
 *   }),
 *   enabled: true,
 * });
 *
 * function TestWrapper({ children }) {
 *   return (
 *     <VersionUpdaterProvider config={config}>
 *       {children}
 *     </VersionUpdaterProvider>
 *   );
 * }
 * ```
 */
export function createTestVersionConfig(
  overrides?: Partial<VersionCheckerConfig>,
): VersionCheckerConfig {
  return {
    getCurrentVersion: () => '1.0.0',
    fetcher: createMockFetch({
      '/api/v1/version': { version: '1.0.0' },
      'https://makerkit.dev/api/versions': { supamode: '1.0.0' },
    }),
    checkInterval: 3600,
    enabled: false, // Disabled by default in tests
    isDevelopment: false,
    externalApiUrl: 'https://makerkit.dev/api/versions',
    serverApiUrl: '/api/v1/version',
    ...overrides,
  };
}

/**
 * Example mock responses for common test scenarios
 */
export const mockVersionResponses = {
  /** Server and client are in sync */
  inSync: {
    serverSyncData: {
      type: 'server-sync' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      hasUpdate: false,
      lastChecked: Date.now(),
    },
    externalUpdateData: {
      type: 'external' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      hasUpdate: false,
      lastChecked: Date.now(),
    },
  },

  /** Server is ahead of client (needs refresh) */
  serverAhead: {
    serverSyncData: {
      type: 'server-sync' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      hasUpdate: true,
      lastChecked: Date.now(),
    },
    externalUpdateData: null,
  },

  /** External update available */
  externalUpdateAvailable: {
    serverSyncData: null,
    externalUpdateData: {
      type: 'external' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      hasUpdate: true,
      lastChecked: Date.now(),
    },
  },

  /** Both updates available (server takes priority) */
  bothUpdatesAvailable: {
    serverSyncData: {
      type: 'server-sync' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      hasUpdate: true,
      lastChecked: Date.now(),
    },
    externalUpdateData: {
      type: 'external' as const,
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      hasUpdate: true,
      lastChecked: Date.now(),
    },
  },
};
