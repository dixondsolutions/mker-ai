import { useCallback, useSyncExternalStore } from 'react';

import { useTranslation } from 'react-i18next';

import { globalTabsStore } from '../store/tabs-store';
import type { DataExplorerTab } from '../store/tabs-store';

export type { DataExplorerTab };

export function useDataExplorerTabs() {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    globalTabsStore.subscribe.bind(globalTabsStore),
    globalTabsStore.getSnapshot.bind(globalTabsStore),
  );

  // Create a new tab
  const createTab = useCallback(
    (
      title: string,
      path: string,
      schema?: string,
      table?: string,
      isEmpty = false,
    ) => {
      return globalTabsStore.createTab(title, path, schema, table, isEmpty);
    },
    [],
  );

  // Create an empty tab that will be filled when user navigates
  const createEmptyTab = useCallback(() => {
    return createTab(
      t('dataExplorer:tabs.newTab'),
      '/resources',
      undefined,
      undefined,
      true,
    );
  }, [createTab, t]);

  // Activate a tab
  const activateTab = useCallback((tabId: string) => {
    globalTabsStore.activateTab(tabId);
  }, []);

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    globalTabsStore.closeTab(tabId);
  }, []);

  // Update tab info (e.g., when navigating within the same tab)
  const updateTab = useCallback(
    (tabId: string, updates: Partial<Omit<DataExplorerTab, 'id'>>) => {
      // For now, delegate to updateActiveTab if it's the active tab
      if (state.activeTab?.id === tabId) {
        globalTabsStore.updateActiveTab(
          updates.title || state.activeTab.title,
          updates.path || state.activeTab.path,
          updates.schema !== undefined
            ? updates.schema
            : state.activeTab.schema,
          updates.table !== undefined ? updates.table : state.activeTab.table,
        );
      }
    },
    [state.activeTab],
  );

  // Update the active tab with new navigation
  const updateActiveTab = useCallback(
    (title: string, path: string, schema?: string, table?: string) => {
      globalTabsStore.updateActiveTab(title, path, schema, table);
    },
    [],
  );

  // Check if a tab exists for a given path
  const findTabByPath = useCallback((path: string) => {
    return globalTabsStore.findTabByPath(path);
  }, []);

  return {
    tabs: state.tabs,
    activeTab: state.activeTab,
    activeTabId: state.activeTabId,
    createTab,
    createEmptyTab,
    activateTab,
    closeTab,
    updateTab,
    updateActiveTab,
    findTabByPath,
  };
}
