/**
 * @name buildResourceUrl
 * @description Builds a resource URL for a given schema, table, and record.
 */
export function buildResourceUrl<
  Config extends {
    primary_keys: Array<{ column_name: string }>;
    unique_constraints: Array<{ constraint_name: string }>;
  },
>(params: {
  schema: string;
  table: string;
  record: Record<string, unknown>;
  tableMetadata: Config;
}) {
  const { schema, table, record, tableMetadata } = params;

  let primaryKeys = tableMetadata.primary_keys
    .map((pk) => pk.column_name)
    .flat()
    .filter(Boolean);

  let uniqueConstraints = tableMetadata.unique_constraints
    .map((uc) => uc.constraint_name)
    .flat()
    .filter(Boolean);

  // remove duplicate primary keys
  primaryKeys = Array.from(new Set(primaryKeys));
  uniqueConstraints = Array.from(new Set(uniqueConstraints));

  // Case 1: Has primary key(s)
  if (primaryKeys.length > 0) {
    // Single primary key (most common case)
    if (primaryKeys.length === 1) {
      const pkColumn = primaryKeys[0];

      if (!pkColumn) {
        return '';
      }

      return `/resources/${schema}/${table}/record/${record[pkColumn]}`;
    }
    // Composite primary key
    else {
      const params = new URLSearchParams();

      primaryKeys.forEach((pk) => {
        params.append(pk, record[pk] as string);
      });

      return `/resources/${schema}/${table}/record?${params.toString()}`;
    }
  }

  // Case 2: No primary key, but has unique constraint
  if (uniqueConstraints.length > 0) {
    if (uniqueConstraints.length === 1) {
      const uniqueColumn = uniqueConstraints[0];

      if (!uniqueColumn) {
        return '';
      }

      return `/resources/${schema}/${table}/record/${record[uniqueColumn]}`;
    } else {
      const params = new URLSearchParams();

      uniqueConstraints.forEach((col: string) => {
        params.append(col, record[col] as string);
      });

      return `/resources/${schema}/${table}/record?${params.toString()}`;
    }
  }

  // we cannot build a resource url for this record because it has no primary key or unique constraint and would be risky
  return '';
}

/**
 * @name RecordIdentifier
 * @description Type definitions for record identifier responses
 */
export type RecordIdentifier =
  | { type: 'single'; column: string; value: unknown }
  | { type: 'composite'; values: Record<string, unknown> }
  | { type: 'rowIndex'; value: unknown }
  | { type: 'none' };

/**
 * @name getRecordIdentifier
 * @description Extracts the identifying information from a record that can be used to pinpoint a specific row.
 * Returns structured data about how to identify the record (primary key, unique constraint, or row index).
 */
export function getRecordIdentifier(params: {
  record: Record<string, unknown>;
  tableMetadata: {
    primaryKeys: string[];
    uniqueConstraints: string[];
  };
}): RecordIdentifier {
  const { record, tableMetadata } = params;
  const primaryKeys = tableMetadata.primaryKeys || [];
  const uniqueConstraints = tableMetadata.uniqueConstraints || [];

  // Case 1: Has primary key(s)
  if (primaryKeys.length > 0) {
    // Single primary key (most common case)
    if (primaryKeys.length === 1) {
      const pkColumn = primaryKeys[0];

      if (!pkColumn || record[pkColumn] == null) {
        return { type: 'none' };
      }

      return { type: 'single', column: pkColumn, value: record[pkColumn] };
    }
    // Composite primary key
    else {
      const values: Record<string, unknown> = {};
      let hasAllValues = true;

      primaryKeys.forEach((pk) => {
        if (record[pk] != null) {
          values[pk] = record[pk];
        } else {
          hasAllValues = false;
        }
      });

      if (hasAllValues) {
        return { type: 'composite', values };
      }

      return { type: 'none' };
    }
  }

  // Case 2: No primary key, but has unique constraint
  if (uniqueConstraints.length > 0) {
    if (uniqueConstraints.length === 1) {
      const uniqueColumn = uniqueConstraints[0];

      if (!uniqueColumn || record[uniqueColumn] == null) {
        return { type: 'none' };
      }

      return {
        type: 'single',
        column: uniqueColumn,
        value: record[uniqueColumn],
      };
    } else {
      const values: Record<string, unknown> = {};
      let hasAllValues = true;

      uniqueConstraints.forEach((col) => {
        if (record[col] != null) {
          values[col] = record[col];
        } else {
          hasAllValues = false;
        }
      });

      if (hasAllValues) {
        return { type: 'composite', values };
      }

      return { type: 'none' };
    }
  }

  // Case 3: No way to identify this record
  return { type: 'none' };
}

/**
 * @name buildWhereClause
 * @description Builds a WHERE clause object that can be used in database queries to identify a specific record.
 * Returns null if the record cannot be reliably identified (when type is 'rowIndex' or 'none').
 */
export function buildWhereClause(params: {
  record: Record<string, unknown>;
  tableMetadata: {
    primaryKeys: string[];
    uniqueConstraints: string[];
  };
}): Record<string, unknown> | null {
  const identifier = getRecordIdentifier(params);

  switch (identifier.type) {
    case 'single':
      return { [identifier.column]: identifier.value };

    case 'composite':
      return identifier.values;

    case 'rowIndex':
    case 'none':
      // Cannot build a reliable WHERE clause for these cases
      return null;
  }

  return null;
}
