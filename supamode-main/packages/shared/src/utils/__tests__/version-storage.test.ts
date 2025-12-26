import { beforeEach, describe, expect, it } from 'vitest';

import type { VersionStorage } from '../version-storage';
import {
  DISMISSED_VERSIONS_KEY,
  VERSION_CHECK_KEY,
  cleanupDismissedVersions,
  clearVersionCheckData,
  dismissVersionComparison,
  getDismissedVersions,
  isVersionComparisonDismissed,
  shouldSkipVersionCheck,
  updateLastVersionCheck,
} from '../version-storage';

/**
 * Create a mock storage implementation for testing
 */
function createMockStorage(): VersionStorage {
  const storage = new Map<string, string>();

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
}

describe('version-storage', () => {
  let mockStorage: VersionStorage;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('shouldSkipVersionCheck', () => {
    it('returns false when no last check exists', () => {
      expect(shouldSkipVersionCheck(3600, mockStorage)).toBe(false);
    });

    it('returns false when last check time is invalid', () => {
      mockStorage.setItem(VERSION_CHECK_KEY, 'invalid');
      expect(shouldSkipVersionCheck(3600, mockStorage)).toBe(false);
    });

    it('returns true when checked recently (within interval)', () => {
      const now = Date.now();
      mockStorage.setItem(VERSION_CHECK_KEY, now.toString());

      // Check with 1 hour interval - should skip
      expect(shouldSkipVersionCheck(3600, mockStorage)).toBe(true);
    });

    it('returns false when last check exceeded interval', () => {
      const oneHourAgo = Date.now() - 3600 * 1000 - 1000; // 1 hour + 1 second ago
      mockStorage.setItem(VERSION_CHECK_KEY, oneHourAgo.toString());

      // Check with 1 hour interval - should not skip
      expect(shouldSkipVersionCheck(3600, mockStorage)).toBe(false);
    });

    it('returns false exactly at interval boundary', () => {
      const exactlyOneHourAgo = Date.now() - 3600 * 1000;
      mockStorage.setItem(VERSION_CHECK_KEY, exactlyOneHourAgo.toString());

      expect(shouldSkipVersionCheck(3600, mockStorage)).toBe(false);
    });
  });

  describe('updateLastVersionCheck', () => {
    it('stores current timestamp', () => {
      const before = Date.now();
      updateLastVersionCheck(mockStorage);
      const after = Date.now();

      const stored = mockStorage.getItem(VERSION_CHECK_KEY);
      expect(stored).toBeTruthy();

      const timestamp = parseInt(stored!, 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getDismissedVersions', () => {
    it('returns empty array when no dismissals exist', () => {
      expect(getDismissedVersions(mockStorage)).toEqual([]);
    });

    it('returns empty array for invalid JSON', () => {
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, 'invalid-json');
      expect(getDismissedVersions(mockStorage)).toEqual([]);
    });

    it('returns empty array for non-array JSON', () => {
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, '{"not": "an array"}');
      expect(getDismissedVersions(mockStorage)).toEqual([]);
    });

    it('returns array of dismissed versions', () => {
      const dismissals = ['1.0.0→1.1.0', '1.0.0→1.2.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      expect(getDismissedVersions(mockStorage)).toEqual(dismissals);
    });
  });

  describe('isVersionComparisonDismissed', () => {
    it('returns false when no dismissals exist', () => {
      expect(isVersionComparisonDismissed('1.0.0', '1.1.0', mockStorage)).toBe(
        false,
      );
    });

    it('returns true for dismissed comparison', () => {
      const dismissals = ['1.0.0→1.1.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      expect(isVersionComparisonDismissed('1.0.0', '1.1.0', mockStorage)).toBe(
        true,
      );
    });

    it('returns false for non-dismissed comparison', () => {
      const dismissals = ['1.0.0→1.1.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      expect(isVersionComparisonDismissed('1.0.0', '1.2.0', mockStorage)).toBe(
        false,
      );
    });
  });

  describe('dismissVersionComparison', () => {
    it('adds new dismissal to empty storage', () => {
      dismissVersionComparison('1.0.0', '1.1.0', mockStorage);

      const dismissed = getDismissedVersions(mockStorage);
      expect(dismissed).toEqual(['1.0.0→1.1.0']);
    });

    it('adds new dismissal to existing dismissals', () => {
      const existing = ['1.0.0→1.1.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(existing));

      dismissVersionComparison('1.0.0', '1.2.0', mockStorage);

      const dismissed = getDismissedVersions(mockStorage);
      expect(dismissed).toEqual(['1.0.0→1.1.0', '1.0.0→1.2.0']);
    });

    it('does not add duplicate dismissals', () => {
      dismissVersionComparison('1.0.0', '1.1.0', mockStorage);
      dismissVersionComparison('1.0.0', '1.1.0', mockStorage);

      const dismissed = getDismissedVersions(mockStorage);
      expect(dismissed).toEqual(['1.0.0→1.1.0']);
    });
  });

  describe('cleanupDismissedVersions', () => {
    it('removes dismissals for old current versions', () => {
      const dismissals = ['1.0.0→1.1.0', '1.0.0→1.2.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      // User updated to 1.1.0
      cleanupDismissedVersions('1.1.0', '1.3.0', mockStorage);

      const remaining = getDismissedVersions(mockStorage);
      expect(remaining).toEqual([]);
    });

    it('removes dismissals when newer version is available', () => {
      const dismissals = ['1.0.0→1.1.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      // Latest version is now 1.2.0 (newer than dismissed 1.1.0)
      cleanupDismissedVersions('1.0.0', '1.2.0', mockStorage);

      const remaining = getDismissedVersions(mockStorage);
      expect(remaining).toEqual([]);
    });

    it('keeps dismissals that are still relevant', () => {
      const dismissals = ['1.0.0→1.2.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      // Latest is still 1.2.0 (same as dismissed)
      cleanupDismissedVersions('1.0.0', '1.2.0', mockStorage);

      const remaining = getDismissedVersions(mockStorage);
      expect(remaining).toEqual(['1.0.0→1.2.0']);
    });

    it('removes invalid dismissal entries (malformed)', () => {
      const dismissals = ['1.0.0→1.1.0', 'invalid-entry', '→1.2.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      cleanupDismissedVersions('1.0.0', '1.3.0', mockStorage);

      // All should be removed (first due to newer version, others due to invalid format)
      const remaining = getDismissedVersions(mockStorage);
      expect(remaining).toEqual([]);
    });

    it('does not update storage if nothing was removed', () => {
      const dismissals = ['1.0.0→1.2.0'];
      mockStorage.setItem(DISMISSED_VERSIONS_KEY, JSON.stringify(dismissals));

      const beforeCleanup = mockStorage.getItem(DISMISSED_VERSIONS_KEY);

      cleanupDismissedVersions('1.0.0', '1.2.0', mockStorage);

      const afterCleanup = mockStorage.getItem(DISMISSED_VERSIONS_KEY);
      expect(afterCleanup).toBe(beforeCleanup);
    });
  });

  describe('clearVersionCheckData', () => {
    it('removes all version check data', () => {
      mockStorage.setItem(VERSION_CHECK_KEY, Date.now().toString());
      mockStorage.setItem(
        DISMISSED_VERSIONS_KEY,
        JSON.stringify(['1.0.0→1.1.0']),
      );

      clearVersionCheckData(mockStorage);

      expect(mockStorage.getItem(VERSION_CHECK_KEY)).toBeNull();
      expect(mockStorage.getItem(DISMISSED_VERSIONS_KEY)).toBeNull();
    });

    it('handles empty storage gracefully', () => {
      expect(() => clearVersionCheckData(mockStorage)).not.toThrow();
    });
  });
});
