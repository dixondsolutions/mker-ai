import { vi } from 'vitest';

/**
 * Creates a mock Hono context with proper drizzle client mocking
 * for use in test files
 */
export function createMockContext(
  options: {
    drizzleClient?: unknown;
    headers?: Record<string, string>;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  } = {},
) {
  const mockDrizzleClient = options.drizzleClient || {
    runTransaction: vi.fn(),
  };

  return {
    headers: options.headers || {},
    supabaseUrl: options.supabaseUrl || '',
    supabaseAnonKey: options.supabaseAnonKey || '',
    get: vi.fn((key: string) => {
      if (key === 'drizzle') {
        return mockDrizzleClient;
      }
      return undefined;
    }),
  };
}

/**
 * Creates a mock context with a transaction callback for more complex testing
 */
export function createMockContextWithTransaction(
  transactionCallback?: (tx: unknown) => unknown,
) {
  const mockDrizzleClient = {
    runTransaction: vi.fn((callback) => {
      const mockTx = {
        execute: vi.fn(() => Promise.resolve([{ has_data_permission: true }])),
      };
      return transactionCallback
        ? transactionCallback(mockTx)
        : callback(mockTx);
    }),
  };

  return createMockContext({ drizzleClient: mockDrizzleClient });
}
