import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type {
  VersionCheckData,
  VersionCheckerConfig,
} from './use-version-checkers';
import {
  useExternalVersionChecker,
  useServerSyncChecker,
} from './use-version-checkers';

/**
 * Version updater context value
 */
export interface VersionUpdaterContextValue {
  /** Server sync check data */
  serverSyncData: VersionCheckData | null | undefined;
  /** External version check data */
  externalUpdateData: VersionCheckData | null | undefined;
  /** Is loading server sync */
  isLoadingServerSync: boolean;
  /** Is loading external update */
  isLoadingExternalUpdate: boolean;
}

/**
 * Mock version updater context value
 * Useful for testing components that depend on version checking
 */
export interface MockVersionUpdaterContextValue
  extends Partial<VersionUpdaterContextValue> {
  /** Override with mock data */
  mock?: boolean;
}

const VersionUpdaterContext = createContext<
  VersionUpdaterContextValue | undefined
>(undefined);

/**
 * Props for VersionUpdaterProvider
 */
export interface VersionUpdaterProviderProps {
  children: ReactNode;
  /** Optional configuration for version checkers */
  config?: VersionCheckerConfig;
  /** Mock value for testing - when provided, real hooks are not used */
  mockValue?: MockVersionUpdaterContextValue;
}

/**
 * Provider for version updater context
 * Allows dependency injection and mocking for tests
 */
export function VersionUpdaterProvider({
  children,
  config,
  mockValue,
}: VersionUpdaterProviderProps) {
  // Use mock value if provided (for testing)
  const { data: serverSyncData, isLoading: isLoadingServerSync } =
    useServerSyncChecker(mockValue?.mock ? { enabled: false } : config);

  const { data: externalUpdateData, isLoading: isLoadingExternalUpdate } =
    useExternalVersionChecker(mockValue?.mock ? { enabled: false } : config);

  const value: VersionUpdaterContextValue = mockValue?.mock
    ? {
        serverSyncData: mockValue.serverSyncData ?? null,
        externalUpdateData: mockValue.externalUpdateData ?? null,
        isLoadingServerSync: mockValue.isLoadingServerSync ?? false,
        isLoadingExternalUpdate: mockValue.isLoadingExternalUpdate ?? false,
      }
    : {
        serverSyncData: serverSyncData ?? null,
        externalUpdateData: externalUpdateData ?? null,
        isLoadingServerSync,
        isLoadingExternalUpdate,
      };

  return (
    <VersionUpdaterContext.Provider value={value}>
      {children}
    </VersionUpdaterContext.Provider>
  );
}

/**
 * Hook to access version updater context
 * Must be used within VersionUpdaterProvider
 */
export function useVersionUpdater(): VersionUpdaterContextValue {
  const context = useContext(VersionUpdaterContext);

  if (context === undefined) {
    throw new Error(
      'useVersionUpdater must be used within VersionUpdaterProvider',
    );
  }

  return context;
}
