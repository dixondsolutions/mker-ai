import { isVersionNewer } from './version-comparison';

/**
 * Storage interface for version checking
 * Allows easy mocking and testing
 */
export interface VersionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Default localStorage implementation
 */
export const defaultVersionStorage: VersionStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore localStorage errors
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors
    }
  },
};

/**
 * Storage keys
 */
export const VERSION_CHECK_KEY = 'supamode-version-check';
export const DISMISSED_VERSIONS_KEY = 'supamode-dismissed-versions';

/**
 * Check if we should skip the version check based on last check time
 * @param intervalSeconds - Interval in seconds between checks
 * @param storage - Storage implementation (defaults to localStorage)
 * @returns true if check should be skipped
 */
export function shouldSkipVersionCheck(
  intervalSeconds: number,
  storage: VersionStorage = defaultVersionStorage,
): boolean {
  const lastCheck = storage.getItem(VERSION_CHECK_KEY);

  if (!lastCheck) {
    return false;
  }

  const lastCheckTime = parseInt(lastCheck, 10);

  if (isNaN(lastCheckTime)) {
    return false;
  }

  const now = Date.now();
  const intervalMs = intervalSeconds * 1000;

  return now - lastCheckTime < intervalMs;
}

/**
 * Update the last version check timestamp
 * @param storage - Storage implementation (defaults to localStorage)
 */
export function updateLastVersionCheck(
  storage: VersionStorage = defaultVersionStorage,
): void {
  storage.setItem(VERSION_CHECK_KEY, Date.now().toString());
}

/**
 * Get all dismissed version comparisons
 * @param storage - Storage implementation (defaults to localStorage)
 * @returns Array of version comparison strings
 */
export function getDismissedVersions(
  storage: VersionStorage = defaultVersionStorage,
): string[] {
  const dismissed = storage.getItem(DISMISSED_VERSIONS_KEY);

  if (!dismissed) {
    return [];
  }

  try {
    const parsed = JSON.parse(dismissed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific version comparison has been dismissed
 * @param currentVersion - Current version
 * @param latestVersion - Latest version
 * @param storage - Storage implementation (defaults to localStorage)
 * @returns true if this comparison was dismissed
 */
export function isVersionComparisonDismissed(
  currentVersion: string,
  latestVersion: string,
  storage: VersionStorage = defaultVersionStorage,
): boolean {
  const dismissedVersions = getDismissedVersions(storage);
  const comparison = `${currentVersion}→${latestVersion}`;

  return dismissedVersions.includes(comparison);
}

/**
 * Mark a version comparison as dismissed
 * @param currentVersion - Current version
 * @param latestVersion - Latest version
 * @param storage - Storage implementation (defaults to localStorage)
 */
export function dismissVersionComparison(
  currentVersion: string,
  latestVersion: string,
  storage: VersionStorage = defaultVersionStorage,
): void {
  const dismissedVersions = getDismissedVersions(storage);
  const comparison = `${currentVersion}→${latestVersion}`;

  if (!dismissedVersions.includes(comparison)) {
    dismissedVersions.push(comparison);
    storage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissedVersions));
  }
}

/**
 * Clean up dismissed versions that are no longer relevant
 * Removes dismissals when:
 * 1. User has updated their version
 * 2. There's a newer version available than what was dismissed
 *
 * @param currentVersion - Current version
 * @param latestVersion - Latest version available
 * @param storage - Storage implementation (defaults to localStorage)
 */
export function cleanupDismissedVersions(
  currentVersion: string,
  latestVersion: string,
  storage: VersionStorage = defaultVersionStorage,
): void {
  const dismissedVersions = getDismissedVersions(storage);

  // Filter out irrelevant dismissals
  const relevantDismissals = dismissedVersions.filter((comparison) => {
    const [dismissedCurrent, dismissedLatest] = comparison.split('→');

    // If user updated their version, old dismissals are irrelevant
    if (!dismissedCurrent || dismissedCurrent !== currentVersion) {
      return false;
    }

    // If dismissed version is invalid, remove it
    if (!dismissedLatest) {
      return false;
    }

    // If there's a newer version than what was dismissed, allow showing new notification
    if (isVersionNewer(latestVersion, dismissedLatest)) {
      return false;
    }

    return true;
  });

  // Only update storage if we actually removed something
  if (relevantDismissals.length !== dismissedVersions.length) {
    storage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(relevantDismissals));
  }
}

/**
 * Clear all version check data
 * Useful for testing and resetting state
 * @param storage - Storage implementation (defaults to localStorage)
 */
export function clearVersionCheckData(
  storage: VersionStorage = defaultVersionStorage,
): void {
  storage.removeItem(VERSION_CHECK_KEY);
  storage.removeItem(DISMISSED_VERSIONS_KEY);
}
