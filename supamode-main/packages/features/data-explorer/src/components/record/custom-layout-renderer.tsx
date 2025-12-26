import { useCallback, useMemo } from 'react';

import { formatRecord } from '@kit/formatters';
import {
  ColumnMetadata,
  LayoutColumn,
  LayoutGroup,
  LayoutRow,
  RecordLayoutConfig,
  RelationConfig,
} from '@kit/types';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';

import { RecordField } from './record-field';

interface ForeignKeyRecord {
  data: Record<string, unknown>;
  metadata: {
    table: {
      displayName: string | null;
      schemaName: string;
      tableName: string;
      displayFormat: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

interface CustomLayoutRendererProps {
  layout: RecordLayoutConfig;
  columns: ColumnMetadata[];
  relationsConfig: RelationConfig[];
  data: Record<string, unknown>;
  foreignKeyRecords: (ForeignKeyRecord | null)[];
  permissions: { canUpdate: boolean };
  action: string;
}

// Helper to calculate the flex-basis percentage based on column size
const getFlexBasis = (size: number): string => {
  const percentage = (size / 4) * 100; // 4 is max size units per row

  return `${percentage}%`;
};

export function CustomLayoutRenderer({
  layout,
  columns,
  relationsConfig,
  data,
  foreignKeyRecords,
  permissions,
  action,
}: CustomLayoutRendererProps) {
  // Create a map of column names to column metadata for quick lookup
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnMetadata>();

    columns.forEach((col) => {
      map.set(col.name, col);
    });

    return map;
  }, [columns]);

  // Find relation info for a column
  const getRelationInfo = useCallback(
    (columnName: string) => {
      return relationsConfig.find((r) => r.source_column === columnName);
    },
    [relationsConfig],
  );

  // Use the display layout from the custom configuration
  const displayGroups = layout.display;

  return (
    <div className="space-y-2 px-2">
      {displayGroups.map((group: LayoutGroup) => (
        <div key={group.id} className="bg-background rounded-lg border p-4">
          <If condition={!group.isCollapsed}>
            <div className="space-y-1 border-b pt-1 pb-4">
              <Heading
                level={6}
                className={
                  'text-muted-foreground text-sm text-xs font-medium uppercase'
                }
              >
                {group.label}
              </Heading>
            </div>
          </If>

          <If condition={!group.isCollapsed}>
            <div>
              {group.rows.map((row: LayoutRow) => (
                <div
                  key={row.id}
                  className="border-b border-dashed last:border-b-transparent"
                >
                  <If condition={row.columns.length > 0}>
                    <div className="flex gap-4">
                      {row.columns.map((layoutColumn: LayoutColumn) => {
                        // Find the actual column metadata
                        const column = columnMap.get(layoutColumn.fieldName);

                        // Skip if column doesn't exist or isn't visible
                        if (!column || !column.is_visible_in_detail) {
                          return null;
                        }

                        const relationInfo = getRelationInfo(column.name);

                        // Find the related record
                        const relatedRecord = relationInfo
                          ? foreignKeyRecords.find(
                              (record) =>
                                record?.metadata.table?.schemaName ===
                                  relationInfo.target_schema &&
                                record?.metadata.table?.tableName ===
                                  relationInfo.target_table,
                            )
                          : null;

                        // Format the value if it's a relation
                        const formattedValue =
                          relatedRecord &&
                          relatedRecord?.metadata.table?.displayFormat
                            ? formatRecord(
                                relatedRecord.metadata.table?.displayFormat,
                                relatedRecord.data,
                              )
                            : (data[column.name] as string | null | undefined);

                        return (
                          <div
                            key={layoutColumn.id}
                            style={{
                              flexBasis: getFlexBasis(layoutColumn.size),
                              minWidth: 0,
                            }}
                          >
                            <RecordField
                              column={column}
                              value={data[column.name]}
                              relation={{
                                column: column.name,
                                original: data[column.name],
                                formatted: formattedValue,
                                link: null,
                              }}
                              relationConfig={relationInfo}
                              canEdit={permissions.canUpdate}
                              action={action}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </If>
                </div>
              ))}
            </div>
          </If>
        </div>
      ))}
    </div>
  );
}
