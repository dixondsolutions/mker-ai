import { describe, expect, it } from 'vitest';

import {
  areVersionsEqual,
  compareSemanticVersions,
  isVersionNewer,
  parseSemanticVersion,
} from '../version-comparison';

describe('parseSemanticVersion', () => {
  it('parses valid semantic version', () => {
    expect(parseSemanticVersion('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it('parses version with leading zeros', () => {
    expect(parseSemanticVersion('0.0.1')).toEqual({
      major: 0,
      minor: 0,
      patch: 1,
    });
  });

  it('parses version with suffix', () => {
    expect(parseSemanticVersion('1.2.3-beta')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it('returns null for invalid version (missing parts)', () => {
    expect(parseSemanticVersion('1.2')).toBeNull();
  });

  it('returns null for invalid version (non-numeric)', () => {
    expect(parseSemanticVersion('a.b.c')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSemanticVersion('')).toBeNull();
  });

  it('returns null for random string', () => {
    expect(parseSemanticVersion('not-a-version')).toBeNull();
  });
});

describe('compareSemanticVersions', () => {
  describe('equal versions', () => {
    it('returns 0 for identical versions', () => {
      expect(compareSemanticVersions('1.2.3', '1.2.3')).toBe(0);
    });

    it('returns 0 for versions with different suffixes but same numbers', () => {
      expect(compareSemanticVersions('1.2.3-alpha', '1.2.3-beta')).toBe(0);
    });
  });

  describe('version A is newer', () => {
    it('returns 1 when major version is higher', () => {
      expect(compareSemanticVersions('2.0.0', '1.9.9')).toBe(1);
    });

    it('returns 1 when minor version is higher', () => {
      expect(compareSemanticVersions('1.3.0', '1.2.9')).toBe(1);
    });

    it('returns 1 when patch version is higher', () => {
      expect(compareSemanticVersions('1.2.4', '1.2.3')).toBe(1);
    });

    it('returns 1 for 0.10.0 vs 0.9.0 (lexicographic bug fix)', () => {
      expect(compareSemanticVersions('0.10.0', '0.9.0')).toBe(1);
    });
  });

  describe('version A is older', () => {
    it('returns -1 when major version is lower', () => {
      expect(compareSemanticVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('returns -1 when minor version is lower', () => {
      expect(compareSemanticVersions('1.2.0', '1.3.0')).toBe(-1);
    });

    it('returns -1 when patch version is lower', () => {
      expect(compareSemanticVersions('1.2.3', '1.2.4')).toBe(-1);
    });

    it('returns -1 for 0.9.0 vs 0.10.0', () => {
      expect(compareSemanticVersions('0.9.0', '0.10.0')).toBe(-1);
    });
  });

  describe('invalid versions', () => {
    it('returns null when first version is invalid', () => {
      expect(compareSemanticVersions('invalid', '1.2.3')).toBeNull();
    });

    it('returns null when second version is invalid', () => {
      expect(compareSemanticVersions('1.2.3', 'invalid')).toBeNull();
    });

    it('returns null when both versions are invalid', () => {
      expect(compareSemanticVersions('invalid', 'also-invalid')).toBeNull();
    });
  });
});

describe('isVersionNewer', () => {
  it('returns true when first version is newer', () => {
    expect(isVersionNewer('2.0.0', '1.0.0')).toBe(true);
    expect(isVersionNewer('1.3.0', '1.2.0')).toBe(true);
    expect(isVersionNewer('1.2.4', '1.2.3')).toBe(true);
  });

  it('returns false when first version is older', () => {
    expect(isVersionNewer('1.0.0', '2.0.0')).toBe(false);
    expect(isVersionNewer('1.2.0', '1.3.0')).toBe(false);
    expect(isVersionNewer('1.2.3', '1.2.4')).toBe(false);
  });

  it('returns false when versions are equal', () => {
    expect(isVersionNewer('1.2.3', '1.2.3')).toBe(false);
  });

  it('returns false for invalid versions', () => {
    expect(isVersionNewer('invalid', '1.2.3')).toBe(false);
    expect(isVersionNewer('1.2.3', 'invalid')).toBe(false);
  });

  it('correctly handles 0.10.0 vs 0.9.0 (lexicographic bug)', () => {
    expect(isVersionNewer('0.10.0', '0.9.0')).toBe(true);
    expect(isVersionNewer('0.9.0', '0.10.0')).toBe(false);
  });
});

describe('areVersionsEqual', () => {
  it('returns true for identical versions', () => {
    expect(areVersionsEqual('1.2.3', '1.2.3')).toBe(true);
  });

  it('returns true for versions with different suffixes', () => {
    expect(areVersionsEqual('1.2.3-alpha', '1.2.3-beta')).toBe(true);
  });

  it('returns false when versions differ', () => {
    expect(areVersionsEqual('1.2.3', '1.2.4')).toBe(false);
    expect(areVersionsEqual('1.2.3', '1.3.3')).toBe(false);
    expect(areVersionsEqual('1.2.3', '2.2.3')).toBe(false);
  });

  it('returns false for invalid versions', () => {
    expect(areVersionsEqual('invalid', '1.2.3')).toBe(false);
    expect(areVersionsEqual('1.2.3', 'invalid')).toBe(false);
    expect(areVersionsEqual('invalid', 'also-invalid')).toBe(false);
  });
});
