import React, { createContext, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  DEFAULT_FORMATTER_CONTEXT,
  DataFormatterService,
} from './data-formatter.service';
import type {
  FormatterConfig,
  FormatterContext,
  FormatterRegistryEntry,
} from './types';

/**
 * Extended formatter service with dynamic registration capabilities
 */
export class ExtendedFormatterService extends DataFormatterService {
  private customFormatters: Map<string, FormatterRegistryEntry> = new Map();

  /**
   * Register a custom formatter that persists across the application
   */
  registerCustomFormatter(entry: FormatterRegistryEntry): void {
    this.customFormatters.set(entry.name, entry);
    this.registerFormatter(
      entry.name,
      entry.type,
      entry.formatter,
      entry.supportedTypes,
    );
  }

  /**
   * Get all custom formatters
   */
  getCustomFormatters(): FormatterRegistryEntry[] {
    return Array.from(this.customFormatters.values());
  }

  /**
   * Get formatters available for a specific data type
   * Includes both built-in and custom formatters
   */
  getFormattersForType(dataType: string): FormatterRegistryEntry[] {
    const builtIn = this.getAvailableFormatters(dataType);
    const custom = Array.from(this.customFormatters.values()).filter(
      (formatter) =>
        !formatter.supportedTypes ||
        formatter.supportedTypes.includes(dataType.toLowerCase()),
    );

    // Combine and deduplicate by name
    const combined = new Map<string, FormatterRegistryEntry>();

    // Add built-in formatters first
    builtIn.forEach((formatter) => {
      combined.set(formatter.name, {
        name: formatter.name,
        type: formatter.type,
        formatter: () => '', // Placeholder, will be resolved when needed
        supportedTypes: [],
      });
    });

    // Add/override with custom formatters
    custom.forEach((formatter) => {
      combined.set(formatter.name, formatter);
    });

    return Array.from(combined.values());
  }

  /**
   * Check if a formatter exists (built-in or custom)
   */
  hasFormatter(name: string): boolean {
    return (
      this.customFormatters.has(name) ||
      this.getAvailableFormatters().some((f) => f.name === name)
    );
  }
}

/**
 * Context value interface
 */
interface FormatterContextValue {
  service: ExtendedFormatterService;
  context: FormatterContext;
  updateContext: (updates: Partial<FormatterContext>) => void;
  registerCustomFormatter: (formatter: FormatterRegistryEntry) => void;
  getFormattersForType: (dataType: string) => FormatterRegistryEntry[];
  formatValue: (value: unknown, config: FormatterConfig) => string;
}

/**
 * Formatter context
 */
const FormatterProviderContext = createContext<FormatterContextValue | null>(
  null,
);

/**
 * Props for formatter provider
 */
interface FormatterProviderProps {
  children: ReactNode;
  initialContext?: Partial<FormatterContext>;
  customFormatters?: FormatterRegistryEntry[];
}

/**
 * Formatter provider component
 * Provides centralized formatter management across the application
 */
export function FormatterProvider({
  children,
  initialContext = {},
  customFormatters = [],
}: FormatterProviderProps) {
  // Initialize context with defaults and user preferences
  const [context, setContext] = useState<FormatterContext>({
    ...DEFAULT_FORMATTER_CONTEXT,
    ...initialContext,
  });

  // Create service instance
  const service = useMemo(() => {
    const svc = new ExtendedFormatterService(context);

    // Register initial custom formatters
    customFormatters.forEach((formatter) => {
      svc.registerCustomFormatter(formatter);
    });

    return svc;
  }, [context, customFormatters]);

  // Update context handler
  const updateContext = useCallback(
    (updates: Partial<FormatterContext>) => {
      setContext((prev) => {
        const newContext = { ...prev, ...updates };
        service.updateContext(newContext);
        return newContext;
      });
    },
    [service],
  );

  // Register custom formatter handler
  const registerCustomFormatter = useCallback(
    (formatter: FormatterRegistryEntry) => {
      service.registerCustomFormatter(formatter);
    },
    [service],
  );

  // Get formatters for type handler
  const getFormattersForType = useCallback(
    (dataType: string) => {
      return service.getFormattersForType(dataType);
    },
    [service],
  );

  // Format value handler
  const formatValue = useCallback(
    (value: unknown, config: FormatterConfig) => {
      const result = service.format(value, config);
      return result.formatted;
    },
    [service],
  );

  // Create context value
  const contextValue = useMemo(
    () => ({
      service,
      context,
      updateContext,
      registerCustomFormatter,
      getFormattersForType,
      formatValue,
    }),
    [
      service,
      context,
      updateContext,
      registerCustomFormatter,
      getFormattersForType,
      formatValue,
    ],
  );

  return (
    <FormatterProviderContext.Provider value={contextValue}>
      {children}
    </FormatterProviderContext.Provider>
  );
}

/**
 * Hook to access formatter provider
 */
export function useFormatterProvider(): FormatterContextValue {
  const context = React.useContext(FormatterProviderContext);

  if (!context) {
    throw new Error(
      'useFormatterProvider must be used within a FormatterProvider',
    );
  }

  return context;
}
