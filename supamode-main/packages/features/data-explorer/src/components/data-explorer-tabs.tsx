import React, { useCallback, useEffect, useMemo } from 'react';

import { useLocation, useNavigate } from 'react-router';

import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { cn } from '@kit/ui/utils';

import {
  type DataExplorerTab,
  useDataExplorerTabs,
} from '../hooks/use-data-explorer-tabs';

export function DataExplorerTabs() {
  const {
    tabs,
    closeTab,
    activateTab,
    createEmptyTab,
    updateActiveTab,
    activeTab,
  } = useDataExplorerTabs();

  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Track internal navigation (filter changes within the same tab)
  useEffect(() => {
    if (!activeTab || activeTab.isEmpty) {
      return;
    }

    const currentFullPath = location.pathname + location.search;
    const currentBasePath = location.pathname;
    const activeTabBasePath = activeTab.path.split('?')[0];

    // If we're on the same base route but different search params,
    // and the active tab matches this base route, update the tab
    if (
      currentBasePath === activeTabBasePath &&
      currentFullPath !== activeTab.path
    ) {
      // This is an internal filter/pagination change - update current tab
      const pathParts = currentBasePath.split('/').filter(Boolean);

      if (pathParts[0] === 'resources' && pathParts.length >= 3) {
        const schema = pathParts[1];
        const table = pathParts[2];

        // Keep the existing tab title but update the path
        let title = activeTab.title;
        // Remove any Edit/Create suffixes to get base title
        title = title.replace(/ • .*$/, '');

        updateActiveTab(title, currentFullPath, schema, table);
      }
    }
  }, [
    location.pathname,
    location.search,
    // Include activeTab to access its properties, but this is stable through useSyncExternalStore
    activeTab,
    updateActiveTab,
  ]);

  // Apply i18n translations to tab titles
  const translatedTabs = useMemo(() => {
    return tabs.map((tab) => {
      let title = tab.title;

      // Replace hardcoded English text with proper translations
      title = title.replace(' • Edit', ` • ${t('dataExplorer:record.edit')}`);
      title = title.replace(
        ' • Create',
        ` • ${t('dataExplorer:table.createRecord')}`,
      );

      return {
        ...tab,
        title,
      };
    });
  }, [tabs, t]);

  // Tab state updates are now handled by the router loader to prevent flickering

  const onNewTab = useCallback(() => {
    // Check if there's already an empty tab
    const existingEmptyTab = tabs.find((tab) => tab.isEmpty);

    if (existingEmptyTab) {
      // Activate the existing empty tab instead of creating a new one
      activateTab(existingEmptyTab.id);
      navigate('/resources');
    } else {
      // Only create a new empty tab if none exists
      createEmptyTab();
      navigate('/resources');
    }
  }, [createEmptyTab, navigate, tabs, activateTab]);

  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const tabToClose = tabs.find((tab) => tab.id === tabId);
      const wasActiveTab = tabToClose?.isActive;
      const remainingTabs = tabs.filter((tab) => tab.id !== tabId);

      closeTab(tabId);

      // Handle navigation after closing tab
      if (wasActiveTab) {
        if (remainingTabs.length > 0) {
          // Navigate to the last remaining tab
          const lastTab = remainingTabs[remainingTabs.length - 1];
          if (lastTab) {
            navigate(lastTab.path);
          }
        } else {
          // No tabs remaining - navigate to empty state
          navigate('/resources');
        }
      }
    },
    [closeTab, navigate, tabs],
  );

  const handleTabClick = useCallback(
    (e: React.MouseEvent, tab: DataExplorerTab) => {
      e.preventDefault();

      // Compare full path including search params
      const currentFullPath = location.pathname + location.search;

      if (currentFullPath !== tab.path) {
        // Navigate first, tab activation will happen via router loader
        // This prevents state/URL desynchronization
        navigate(tab.path);
      } else {
        // We're already on this path, just activate the tab
        activateTab(tab.id);
      }
    },
    [activateTab, location.pathname, location.search, navigate],
  );

  return (
    <div
      data-testid="tabs-container"
      className="flex h-10 min-h-10 items-center border-b px-2 py-0.5"
    >
      <div className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
        <Button
          data-testid="new-tab-button"
          variant="ghost"
          size="sm"
          className="hover:bg-muted h-6 flex-shrink-0 px-2 text-xs"
          onClick={onNewTab}
          title={t('dataExplorer:table.addNew', 'Add new')}
        >
          <Plus className="mr-1 h-3 w-3" />

          <span className="hidden sm:inline">
            {t('common:new', 'New')} {t('common:tab', 'Tab')}
          </span>

          <span className="sm:hidden">+</span>
        </Button>

        {translatedTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            onClick={(e) => handleTabClick(e, tab)}
            onClose={(e) => handleCloseTab(e, tab.id)}
            showCloseButton={true}
          />
        ))}
      </div>
    </div>
  );
}

interface TabItemProps {
  tab: DataExplorerTab;
  onClick: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
  showCloseButton: boolean;
}

function TabItem({ tab, onClick, onClose, showCloseButton }: TabItemProps) {
  const { t } = useTranslation();

  return (
    <button
      data-testid="tab-item"
      className={cn(
        'group flex h-6 max-w-48 min-w-8 flex-shrink-0 items-center justify-between gap-1 rounded-md px-1.5 text-sm transition-colors',
        'hover:bg-background/80 hover:text-foreground animate-in zoom-in-95 border border-transparent duration-100',
        tab.isActive
          ? 'bg-background text-foreground border-foreground/20'
          : 'text-muted-foreground',
        tab.isEmpty && 'italic opacity-75',
      )}
      onClick={onClick}
    >
      <span className="truncate text-xs font-medium">
        {tab.isEmpty
          ? `${t('common:new', 'New')} ${t('common:tab', 'Tab')}`
          : tab.title}
      </span>

      <If condition={showCloseButton}>
        <span
          data-testid="tab-close-button"
          role={'button'}
          onClick={onClose}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity',
            'hover:bg-muted group-hover:opacity-100',
            tab.isActive && 'opacity-70',
          )}
        >
          <X className="h-2.5 w-2.5" />
        </span>
      </If>
    </button>
  );
}
