/**
 * Utilities for managing dashboard selection persistence
 */

const LAST_DASHBOARD_KEY = 'supamode_last_dashboard_id';

/**
 * Dashboard storage utilities
 */
export const dashboardStorage = {
  /**
   * Get the last selected dashboard ID from sessionStorage
   * @returns The last selected dashboard ID or null if not found
   */
  getLastDashboard() {
    if (typeof window === 'undefined') return null;

    try {
      return sessionStorage.getItem(LAST_DASHBOARD_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Store the last selected dashboard ID in sessionStorage
   * @param dashboardId - The dashboard ID to store
   */
  setLastDashboard(dashboardId: string) {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(LAST_DASHBOARD_KEY, dashboardId);
    } catch {
      // Silently fail if sessionStorage is not available
    }
  },

  /**
   * Clear the stored dashboard ID
   * @returns The last selected dashboard ID or null if not found
   */
  clearLastDashboard() {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem(LAST_DASHBOARD_KEY);
    } catch {
      // Silently fail if sessionStorage is not available
    }
  },
};
