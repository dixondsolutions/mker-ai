/**
 * Helper function to strip type casting from values
 * Converts values like "'in_app'::public.notification_channel" to "in_app"
 * @param value The value to strip type casting from
 * @returns The cleaned value without type casting
 */
export function stripTypeCast(value: unknown): string {
  if (typeof value !== "string") {
    return String(value);
  }

  // Match pattern: 'value'::type or "value"::type
  const typecastRegex = /^['"](.+)['"]::[\w\s.]+$/;
  const match = value.match(typecastRegex);

  return match ? String(match[1]) : value;
}
