/**
 * Extracts error message from an error object
 * @param error - The error object (could be Error instance or unknown)
 * @returns The error message as a string
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}
