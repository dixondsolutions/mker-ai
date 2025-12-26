import { createContext, useContext } from 'react';

import type { DashboardWidget, Layout } from '../types';

interface DashboardContextValue {
  // Edit mode state
  isEditing: boolean;
  onToggleEdit: () => void;
  onSave?: () => void;
  onReset?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  // Permissions
  canEdit?: boolean;
  // Layout management
  layout?: Layout;
  updateLayout?: (layout: Layout) => void;
  // Widget wizard state
  isWidgetWizardOpen: boolean;
  editingWidget?: DashboardWidget;
  openWidgetWizard: (editingWidget?: DashboardWidget) => void;
  closeWidgetWizard: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(
  null,
);

export function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      'useDashboardContext must be used within a DashboardProvider',
    );
  }
  return context;
}

export function useDashboardContextOptional() {
  return useContext(DashboardContext);
}
