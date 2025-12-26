import type { FilterItem, SortState } from '../types';

/**
 * Interface for filter state parameter management
 * Different contexts (data explorer vs dashboard) can implement this differently
 */
export interface StateAdapter {
  /**
   * Get current filter parameters as an object
   */
  getParams(): Record<string, string>;

  /**
   * Update filter parameters
   */
  setParams(params: Record<string, string>): void;

  /**
   * Get a specific parameter value
   */
  getParam(key: string): string | null;

  /**
   * Set a specific parameter
   */
  setParam(key: string, value: string): void;

  /**
   * Delete a specific parameter
   */
  deleteParam(key: string): void;

  /**
   * Clear all parameters
   */
  clearParams(): void;
}

/**
 * State adapter for React Router URL parameters (data explorer context)
 */
export class ReactRouterStateAdapter implements StateAdapter {
  constructor(
    private searchParams: URLSearchParams,
    private setSearchParams: (params: URLSearchParams) => void,
  ) {}

  getParams(): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of this.searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }

  setParams(params: Record<string, string>): void {
    const urlSearchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlSearchParams.set(key, value);
      }
    });
    this.setSearchParams(urlSearchParams);
  }

  getParam(key: string): string | null {
    return this.searchParams.get(key);
  }

  setParam(key: string, value: string): void {
    this.searchParams.set(key, value);
    this.setSearchParams(this.searchParams);
  }

  deleteParam(key: string): void {
    this.searchParams.delete(key);
    this.setSearchParams(this.searchParams);
  }

  clearParams(): void {
    this.setSearchParams(new URLSearchParams());
  }
}

/**
 * In-memory state adapter for dashboard context (stores state in memory)
 */
export class InMemoryStateAdapter implements StateAdapter {
  private params: Record<string, string> = {};
  private listeners: Array<(params: Record<string, string>) => void> = [];

  constructor(initialParams: Record<string, string> = {}) {
    this.params = { ...initialParams };
  }

  /**
   * Subscribe to parameter changes
   */
  subscribe(listener: (params: Record<string, string>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener({ ...this.params }));
  }

  getParams(): Record<string, string> {
    return { ...this.params };
  }

  setParams(params: Record<string, string>): void {
    this.params = { ...params };
    this.notify();
  }

  getParam(key: string): string | null {
    return this.params[key] || null;
  }

  setParam(key: string, value: string): void {
    this.params[key] = value;
    this.notify();
  }

  deleteParam(key: string): void {
    delete this.params[key];
    this.notify();
  }

  clearParams(): void {
    this.params = {};
    this.notify();
  }
}

/**
 * LocalStorage state adapter (persists state in localStorage)
 */
export class LocalStorageStateAdapter implements StateAdapter {
  private listeners: Array<(params: Record<string, string>) => void> = [];

  constructor(private storageKey: string) {}

  /**
   * Subscribe to parameter changes
   */
  subscribe(listener: (params: Record<string, string>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.getParams()));
  }

  private getStoredParams(): Record<string, string> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private setStoredParams(params: Record<string, string>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(params));
    } catch {
      // Handle localStorage errors silently
    }
  }

  getParams(): Record<string, string> {
    return this.getStoredParams();
  }

  setParams(params: Record<string, string>): void {
    this.setStoredParams(params);
    this.notify();
  }

  getParam(key: string): string | null {
    const params = this.getStoredParams();
    return params[key] || null;
  }

  setParam(key: string, value: string): void {
    const params = this.getStoredParams();
    params[key] = value;
    this.setStoredParams(params);
    this.notify();
  }

  deleteParam(key: string): void {
    const params = this.getStoredParams();
    delete params[key];
    this.setStoredParams(params);
    this.notify();
  }

  clearParams(): void {
    this.setStoredParams({});
    this.notify();
  }
}

/**
 * Utility functions for working with state adapters
 */
export class StateAdapterUtils {
  /**
   * Converts filters and sort state to parameter object
   */
  static filtersToParams(
    filters: FilterItem[],
    sort: SortState,
    activeViewId?: string,
    search?: string,
  ): Record<string, string> {
    const params: Record<string, string> = {};

    if (activeViewId) {
      params['view'] = activeViewId;
    }

    if (search) {
      params['search'] = search;
    }

    if (sort?.column) {
      params['sort_column'] = sort.column;
    }

    if (sort?.direction) {
      params['sort_direction'] = sort.direction;
    }

    filters.forEach((f) => {
      const filterValue = f.values[0];

      if (filterValue?.value !== undefined) {
        const operator = filterValue.operator || 'eq';
        const stringValue =
          filterValue.value instanceof Date
            ? filterValue.value.toISOString()
            : String(filterValue.value);

        params[`${f.name}.${operator}`] = stringValue;
      }
    });

    return params;
  }

  /**
   * Extracts sort state from parameters
   */
  static extractSortFromParams(params: Record<string, string>): SortState {
    return {
      column: params['sort_column'] || null,
      direction: (params['sort_direction'] as 'asc' | 'desc') || null,
    };
  }

  /**
   * Extracts search from parameters
   */
  static extractSearchFromParams(params: Record<string, string>): string {
    return params['search'] || '';
  }

  /**
   * Extracts active view ID from parameters
   */
  static extractViewFromParams(params: Record<string, string>): string {
    return params['view'] || '';
  }
}
