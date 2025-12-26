import { useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { formatRecord } from '@kit/formatters';
import { ColumnMetadata, RelationConfig } from '@kit/types';
import { Heading } from '@kit/ui/heading';

import { recordLoader } from '../../api/loaders/record-loader';
import { RecordField } from './record-field';

type LoaderData = Awaited<ReturnType<typeof recordLoader>>;

// Groups for column organization
const COLUMN_GROUPS = {
  main: 'main',
  system: 'system',
  relations: 'relations',
} as const;

// Interface for the grouped columns
interface ColumnGroup {
  key: string;
  title: string;
  description: string;
  columns: ColumnMetadata[];
}

interface DefaultLayoutRendererProps {
  columns: ColumnMetadata[];
  relationsConfig: RelationConfig[];
  data: LoaderData['data'];
  foreignKeyRecords: LoaderData['foreignKeyRecords'];
  permissions: { canUpdate: boolean };
  action: string;
}

export function DefaultLayoutRenderer({
  columns,
  relationsConfig,
  data,
  foreignKeyRecords,
  permissions,
  action,
}: DefaultLayoutRendererProps) {
  const { t } = useTranslation();

  // Group columns by category using the default algorithm
  const groupedColumns = useMemo<ColumnGroup[]>(() => {
    // Define your groups - can be expanded or loaded from metadata
    const groups = {
      [COLUMN_GROUPS.main]: {
        title: t('dataExplorer:record.basicInformation'),
        description: t('dataExplorer:record.basicInformationDescription'),
        columns: [] as ColumnMetadata[],
      },
      [COLUMN_GROUPS.system]: {
        title: t('dataExplorer:record.systemFields'),
        description: t('dataExplorer:record.systemFieldsDescription'),
        columns: [] as ColumnMetadata[],
      },
      [COLUMN_GROUPS.relations]: {
        title: t('dataExplorer:record.relatedRecords'),
        description: t('dataExplorer:record.relatedRecordsDescription'),
        columns: [] as ColumnMetadata[],
      },
    };

    // Sort columns into groups based on naming patterns or metadata
    columns
      .filter((col) => col.is_visible_in_detail)
      .sort((a, b) => {
        if (!a.ordering || !b.ordering) {
          return 0;
        }

        return a.ordering - b.ordering;
      })
      .forEach((column) => {
        const isRelation = relationsConfig.find(
          (r) => r.source_column === column.name,
        );

        // System fields detection
        if (
          column.name === 'id' ||
          column.name.endsWith('_at') ||
          column.name.endsWith('_by') ||
          (column.name.endsWith('_id') && !isRelation)
        ) {
          groups[COLUMN_GROUPS.system].columns.push(column);
        }

        // Relation fields
        else if (isRelation) {
          groups[COLUMN_GROUPS.relations].columns.push(column);
        }

        // Default to main group
        else {
          groups[COLUMN_GROUPS.main].columns.push(column);
        }
      });

    // Filter out empty groups
    return Object.entries(groups)
      .filter(([_, group]) => group.columns.length > 0)
      .map(([key, group]) => ({ key, ...group }));
  }, [columns, relationsConfig, t]);

  // Find relation info for a column
  const getRelationConfig = useCallback(
    (columnName: string) => {
      return relationsConfig.find((r) => r.source_column === columnName);
    },
    [relationsConfig],
  );

  return (
    <div className="space-y-2 px-2">
      {groupedColumns.map((group) => (
        <div className="bg-background rounded-md border p-4" key={group.key}>
          <div className="space-y-1 border-b pt-1 pb-4">
            <Heading
              level={6}
              className={
                'text-muted-foreground text-sm text-xs font-medium uppercase'
              }
            >
              {group.title}
            </Heading>
          </div>

          {group.columns.map((column) => {
            const relationConfig = getRelationConfig(column.name);

            // find the related record
            const relatedRecord = relationConfig
              ? foreignKeyRecords.find(
                  (record) =>
                    record?.metadata.table?.schemaName ===
                      relationConfig.target_schema &&
                    record?.metadata.table?.tableName ===
                      relationConfig.target_table,
                )
              : null;

            // if the related record is found, format the value
            const formattedValue =
              relatedRecord && relatedRecord?.metadata.table?.displayFormat
                ? formatRecord(
                    relatedRecord.metadata.table?.displayFormat,
                    relatedRecord.data,
                  )
                : undefined;

            const relation = relatedRecord
              ? {
                  column: column.name,
                  original: data[column.name],
                  formatted: formattedValue as string | null | undefined,
                  link: null,
                }
              : undefined;

            return (
              <RecordField
                key={column.name}
                column={column}
                value={data[column.name]}
                relation={relation}
                relationConfig={relationConfig}
                canEdit={permissions.canUpdate}
                action={action}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
