/**
 * Parse a semantic version string into comparable parts
 * @param version - Version string in format "X.Y.Z" or "X.Y.Z-suffix"
 * @returns Object with major, minor, patch numbers, or null if invalid
 */
export function parseSemanticVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!match || !match[1] || !match[2] || !match[3]) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two semantic versions
 * @param versionA - First version string
 * @param versionB - Second version string
 * @returns -1 if A < B, 0 if A === B, 1 if A > B, null if either version is invalid
 */
export function compareSemanticVersions(
  versionA: string,
  versionB: string,
): -1 | 0 | 1 | null {
  const parsedA = parseSemanticVersion(versionA);
  const parsedB = parseSemanticVersion(versionB);

  if (!parsedA || !parsedB) {
    return null;
  }

  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1;
  }

  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1;
  }

  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch > parsedB.patch ? 1 : -1;
  }

  return 0;
}

/**
 * Check if version A is newer than version B
 * @param versionA - Version to check if newer
 * @param versionB - Version to compare against
 * @returns true if A is newer than B, false otherwise (including if versions are invalid)
 */
export function isVersionNewer(versionA: string, versionB: string): boolean {
  const comparison = compareSemanticVersions(versionA, versionB);
  return comparison === 1;
}

/**
 * Check if two versions are equal
 * @param versionA - First version
 * @param versionB - Second version
 * @returns true if versions are equal, false otherwise (including if versions are invalid)
 */
export function areVersionsEqual(versionA: string, versionB: string): boolean {
  const comparison = compareSemanticVersions(versionA, versionB);
  return comparison === 0;
}
