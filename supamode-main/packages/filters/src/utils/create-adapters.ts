import {
  InMemoryStateAdapter,
  LocalStorageStateAdapter,
  ReactRouterStateAdapter,
  StateAdapter,
} from './state-adapters';

/**
 * Factory function to create a React Router state adapter
 */
export function createReactRouterAdapter(
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
): StateAdapter {
  return new ReactRouterStateAdapter(searchParams, setSearchParams);
}

/**
 * Factory function to create an in-memory state adapter
 */
export function createInMemoryAdapter(
  initialParams: Record<string, string> = {},
): InMemoryStateAdapter {
  return new InMemoryStateAdapter(initialParams);
}

/**
 * Factory function to create a localStorage state adapter
 */
export function createLocalStorageAdapter(
  storageKey: string,
): LocalStorageStateAdapter {
  return new LocalStorageStateAdapter(storageKey);
}

/**
 * Factory function to create the appropriate adapter based on context
 */
export function createStateAdapter(
  type: 'router' | 'memory' | 'localStorage',
  options?: {
    // For router adapter
    searchParams?: URLSearchParams;
    setSearchParams?: (params: URLSearchParams) => void;
    // For memory adapter
    initialParams?: Record<string, string>;
    // For localStorage adapter
    storageKey?: string;
  },
): StateAdapter {
  switch (type) {
    case 'router':
      if (!options?.searchParams || !options?.setSearchParams) {
        throw new Error(
          'Router adapter requires searchParams and setSearchParams',
        );
      }
      return createReactRouterAdapter(
        options.searchParams,
        options.setSearchParams,
      );

    case 'memory':
      return createInMemoryAdapter(options?.initialParams);

    case 'localStorage':
      if (!options?.storageKey) {
        throw new Error('LocalStorage adapter requires storageKey');
      }
      return createLocalStorageAdapter(options.storageKey);

    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}
