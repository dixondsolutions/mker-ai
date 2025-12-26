/**
 * Tab management utilities for handling tabs outside of React components
 * This allows us to manage tabs from loaders instead of useEffect
 */
import { getI18n } from 'react-i18next';

import { globalTabsStore } from '../store/tabs-store';

export function ensureTabForPath(
  path: string,
  title: string,
  schema?: string,
  table?: string,
  _displayName?: string,
  _entityDisplayName?: string,
) {
  const snapshot = globalTabsStore.getSnapshot();
  const activeTab = snapshot.activeTab;

  // Rank 1: Fill empty active tab
  if (activeTab?.isEmpty) {
    globalTabsStore.updateActiveTab(title, path, schema, table);
    return;
  }

  // Rank 2: Check for existing tab with exact path
  const exactMatch = globalTabsStore.findTabByPath(path);

  if (exactMatch) {
    if (!exactMatch.isActive) {
      globalTabsStore.activateTab(exactMatch.id);
    }

    // Update title if needed (handles cases where entity names change)
    if (exactMatch.title !== title) {
      globalTabsStore.updateActiveTab(title, path, schema, table);
    }

    return;
  }

  // Rank 3: If there's an active tab, always update it (don't create new tabs)
  if (activeTab) {
    globalTabsStore.updateActiveTab(title, path, schema, table);
    return;
  }

  // Rank 4: Only create new tab if no active tab exists
  globalTabsStore.createTab(title, path, schema, table);
}

export function getPathInfo(
  fullPath: string,
  displayName?: string,
  entityDisplayName?: string,
) {
  const t = getI18n().t;

  // Split path and search params
  const [pathname] = fullPath.split('?');

  if (!pathname) {
    return null;
  }

  const pathParts = pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'resources') {
    return null;
  }

  if (pathParts.length < 3) {
    return {
      type: 'empty' as const,
      title: t('dataExplorer:dataExplorerTitle'),
    };
  }

  const schema = pathParts[1];
  const table = pathParts[2];

  // Use display name if available, otherwise fall back to schema.table
  const baseTitle = displayName || `${schema}.${table}`;
  let title = baseTitle;
  let type: 'table' | 'new' | 'edit' | 'view' = 'table';

  if (pathParts.length > 3) {
    if (pathParts[3] === 'new') {
      // For new record, use proper translation
      const createText = t('dataExplorer:table.createRecord');
      title = `${baseTitle} • ${createText}`;
      type = 'new';
    } else if (pathParts[3] === 'record') {
      if (pathParts.length === 5 && pathParts[4] === 'edit') {
        // Case: /resources/schema/table/record/edit (edit by conditions)
        const editBase = entityDisplayName || baseTitle;
        const editText = t('dataExplorer:record.edit');

        title = `${editBase} • ${editText}`;
        type = 'edit';
      } else if (pathParts.length > 4) {
        if (pathParts.length === 6 && pathParts[5] === 'edit') {
          // Case: /resources/schema/table/record/:id/edit (edit by ID)
          const editBase = entityDisplayName || baseTitle;
          const editText = t('dataExplorer:record.edit');

          title = `${editBase} • ${editText}`;
          type = 'edit';
        } else {
          // Case: /resources/schema/table/record/:id (view by ID)
          // or /resources/schema/table/record (view by conditions)
          title = entityDisplayName || baseTitle;
          type = 'view';
        }
      }
    }
  }

  return {
    type,
    title,
    schema,
    table,
    fullPath, // Include full path with search params
    displayName,
    entityDisplayName,
  };
}
