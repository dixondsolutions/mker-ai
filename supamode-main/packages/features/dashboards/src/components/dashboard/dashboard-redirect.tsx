import { useEffect } from 'react';

import { useNavigate, useRouteLoaderData } from 'react-router';

import { dashboardStorage } from '../../lib/dashboard-storage';
import type { DashboardWithStats } from '../../types';

interface DashboardsData {
  dashboards: DashboardWithStats[];
}

/**
 * Component that handles automatic redirection to the appropriate dashboard
 * Prioritizes last selected dashboard, falls back to first available
 */
export function DashboardRedirect() {
  const navigate = useNavigate();
  const data = useRouteLoaderData('dashboards') as DashboardsData;

  useEffect(() => {
    if (!data?.dashboards?.length) return;

    // Try to get the last selected dashboard from session storage
    const lastDashboardId = dashboardStorage.getLastDashboard();

    // Check if the last selected dashboard still exists
    const lastDashboard = lastDashboardId
      ? data.dashboards.find((d) => d.id === lastDashboardId)
      : null;

    if (lastDashboard) {
      // Navigate to the last selected dashboard
      navigate(`/dashboards/${lastDashboard.id}`);
    } else {
      // Fall back to the first available dashboard
      const firstDashboard = data.dashboards[0];

      if (firstDashboard) {
        navigate(`/dashboards/${firstDashboard.id}`);
        // Store this as the new last selected dashboard
        dashboardStorage.setLastDashboard(firstDashboard.id);
      }
    }
  }, [data?.dashboards, navigate]);

  return null;
}
