/**
 * Centralized tab store with deterministic initialization
 * No circular dependencies, clean separation of concerns
 */

export interface DataExplorerTab {
  id: string;
  title: string;
  path: string;
  schema?: string;
  table?: string;
  isActive: boolean;
  isEmpty?: boolean; // Indicates if this is an empty tab waiting to be filled
  lastAccessed?: number; // Timestamp for LRU tracking
}

const STORAGE_KEY = 'data-explorer-tabs';
const MAX_TABS = 8;

export class TabsStore {
  private tabs: DataExplorerTab[] = [];
  private activeTabId: string | null = null;
  private listeners = new Set<() => void>();

  private cachedSnapshot: {
    tabs: DataExplorerTab[];
    activeTabId: string | null;
    activeTab: DataExplorerTab | null;
  } | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid tabs data structure: not an array');
        }

        // Validate and clean each tab
        const validTabs = parsed.filter((tab): tab is DataExplorerTab => {
          return (
            tab &&
            typeof tab === 'object' &&
            typeof tab.id === 'string' &&
            typeof tab.title === 'string' &&
            typeof tab.path === 'string' &&
            typeof tab.isActive === 'boolean' &&
            // Optional fields
            (tab.schema === undefined || typeof tab.schema === 'string') &&
            (tab.table === undefined || typeof tab.table === 'string') &&
            (tab.isEmpty === undefined || typeof tab.isEmpty === 'boolean') &&
            (tab.lastAccessed === undefined ||
              typeof tab.lastAccessed === 'number')
          );
        });

        // Ensure only one active tab
        let hasActiveTab = false;
        const cleanedTabs = validTabs.map((tab) => {
          if (tab.isActive && hasActiveTab) {
            // Multiple active tabs found, deactivate this one
            return { ...tab, isActive: false };
          }
          if (tab.isActive) {
            hasActiveTab = true;
          }
          return tab;
        });

        this.tabs = cleanedTabs;
        const activeTab = cleanedTabs.find((tab) => tab.isActive);
        if (activeTab) {
          this.activeTabId = activeTab.id;
        }

        // Invalidate cache since we loaded new data
        this.cachedSnapshot = null;
      }
    } catch (error) {
      console.error('Error loading tabs from storage, resetting:', error);
      // Reset to clean state
      this.tabs = [];
      this.activeTabId = null;
      this.cachedSnapshot = null;
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (storageError) {
        console.error('Failed to clear corrupted storage:', storageError);
      }
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tabs));
    } catch (error) {
      console.error('Failed to save tabs to storage:', error);
      // If localStorage is full or unavailable, we can't save but shouldn't crash
      // Consider implementing fallback storage or limiting tab count
    }
  }

  private notify() {
    // Invalidate cached snapshot since state changed
    this.cachedSnapshot = null;
    this.saveToStorage();
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot() {
    // Return cached snapshot if available to prevent infinite re-renders
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }

    // Create new snapshot and cache it
    this.cachedSnapshot = {
      tabs: this.tabs,
      activeTabId: this.activeTabId,
      activeTab: this.tabs.find((tab) => tab.isActive) || null,
    };

    return this.cachedSnapshot;
  }

  createTab(
    title: string,
    path: string,
    schema?: string,
    table?: string,
    isEmpty = false,
  ) {
    const tabId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();

    const newTab: DataExplorerTab = {
      id: tabId,
      title,
      path,
      schema,
      table,
      isActive: true,
      isEmpty,
      lastAccessed: now,
    };

    // Deactivate all existing tabs and update their access time if they were active
    const updatedTabs = this.tabs.map((tab) => ({
      ...tab,
      isActive: false,
      lastAccessed: tab.isActive ? now : (tab.lastAccessed ?? now),
    }));

    let finalTabs = [...updatedTabs, newTab];

    // If we're at max tabs, remove the least recently used non-active tab
    if (finalTabs.length > MAX_TABS) {
      const nonActiveTabs = finalTabs.filter((tab) => !tab.isActive);
      if (nonActiveTabs.length > 0) {
        // Sort by lastAccessed (oldest first) and remove the oldest
        nonActiveTabs.sort(
          (a, b) => (a.lastAccessed ?? 0) - (b.lastAccessed ?? 0),
        );
        const tabToRemove = nonActiveTabs[0];
        if (tabToRemove) {
          finalTabs = finalTabs.filter((tab) => tab.id !== tabToRemove.id);
        }
      } else {
        // Fallback: if somehow all tabs are active (shouldn't happen), remove first
        finalTabs = finalTabs.slice(1);
      }
    }

    this.tabs = finalTabs;
    this.activeTabId = tabId;
    this.notify();

    return tabId;
  }

  updateActiveTab(
    title: string,
    path: string,
    schema?: string,
    table?: string,
  ) {
    const activeTab = this.tabs.find((tab) => tab.isActive);
    if (activeTab) {
      const needsUpdate =
        activeTab.title !== title ||
        activeTab.path !== path ||
        activeTab.schema !== schema ||
        activeTab.table !== table ||
        activeTab.isEmpty;

      if (needsUpdate) {
        const now = Date.now();
        this.tabs = this.tabs.map((tab) =>
          tab.isActive
            ? {
                ...tab,
                title,
                path,
                schema,
                table,
                isEmpty: false,
                lastAccessed: now,
              }
            : tab,
        );
        this.notify();
      }
    }
  }

  activateTab(tabId: string) {
    const now = Date.now();
    this.tabs = this.tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId,
      lastAccessed: tab.id === tabId ? now : tab.lastAccessed,
    }));
    this.activeTabId = tabId;
    this.notify();
  }

  closeTab(tabId: string) {
    const tabToClose = this.tabs.find((tab) => tab.id === tabId);
    const updatedTabs = this.tabs.filter((tab) => tab.id !== tabId);

    const wasActiveTab = tabToClose?.isActive;
    if (wasActiveTab && updatedTabs.length > 0) {
      const lastTab = updatedTabs[updatedTabs.length - 1];
      if (lastTab) {
        lastTab.isActive = true;
        this.activeTabId = lastTab.id;
      }
    } else if (updatedTabs.length === 0) {
      this.activeTabId = null;
    }

    this.tabs = updatedTabs;
    this.notify();
  }

  findTabByPath(path: string, matchMode: 'exact' | 'base' = 'exact') {
    if (matchMode === 'exact') {
      return this.tabs.find((tab) => tab.path === path);
    } else {
      const [targetBase] = path.split('?');
      return this.tabs.find((tab) => {
        const [tabBase] = tab.path.split('?');
        return tabBase === targetBase;
      });
    }
  }
}

// Create the global store instance - deterministic, no circular dependencies
export const globalTabsStore = new TabsStore();
