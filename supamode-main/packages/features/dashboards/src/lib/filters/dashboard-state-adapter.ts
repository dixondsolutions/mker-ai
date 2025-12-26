import type { StateAdapter } from '@kit/filters';

/**
 * Dashboard State Adapter
 *
 * Implements StateAdapter interface for dashboard widgets.
 * Unlike data explorer which uses URL params, dashboard filters are stored
 * in component state and passed through widget configuration.
 */
export class DashboardStateAdapter implements StateAdapter {
  private params: Record<string, string> = {};
  private onParamsChange?: (params: Record<string, string>) => void;

  constructor(
    initialParams: Record<string, string> = {},
    onParamsChange?: (params: Record<string, string>) => void,
  ) {
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
  }

  getParam(key: string): string | null {
    return this.params[key] || null;
  }

  getParams(): Record<string, string> {
    return { ...this.params };
  }

  setParam(key: string, value: string): void {
    this.params = {
      ...this.params,
      [key]: value,
    };
    this.notifyChange();
  }

  setParams(params: Record<string, string>): void {
    this.params = { ...params };
    this.notifyChange();
  }

  deleteParam(key: string): void {
    const { [key]: _, ...rest } = this.params;
    this.params = rest;
    this.notifyChange();
  }

  clearParams(): void {
    this.params = {};
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onParamsChange?.(this.params);
  }
}

/**
 * Create a dashboard state adapter
 */
export function createDashboardStateAdapter(
  initialParams: Record<string, string> = {},
  onParamsChange?: (params: Record<string, string>) => void,
): DashboardStateAdapter {
  return new DashboardStateAdapter(initialParams, onParamsChange);
}
