/**
 * Helper function to strip type casting from values
 *
 * Supports comprehensive PostgreSQL type casting patterns:
 * - Basic types: "'value'::text" → "value"
 * - Array types: "'values'::text[]" → "values"
 * - Parameterized types: "'data'::varchar(255)" → "data"
 * - Schema-qualified types: "'enum'::my-schema.status" → "enum"
 * - Empty values: "''::text" → ""
 * - Mixed quotes: requires matching quote types
 *
 * @param value The value to strip type casting from
 * @returns The cleaned value without type casting
 */
export function stripTypeCast(value: unknown): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  // Match pattern: 'value'::type or "value"::type with proper quote matching
  // Support array types with [], parameterized types with (), empty values, and hyphens in schema names
  const typecastRegex = /^(['"])(.*)\1::[\w\s.[\](),-]+$/;
  const match = value.match(typecastRegex);

  return match ? String(match[2]) : value;
}
