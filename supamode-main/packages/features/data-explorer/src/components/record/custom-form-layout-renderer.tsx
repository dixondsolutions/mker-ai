import { useCallback } from 'react';

import {
  ColumnMetadata,
  LayoutColumn,
  LayoutGroup,
  LayoutRow,
  RecordLayoutConfig,
} from '@kit/types';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { If } from '@kit/ui/if';

interface CustomFormLayoutRendererProps {
  layout: RecordLayoutConfig;
  columnMap: Map<string, ColumnMetadata>;
  renderField: (field: ColumnMetadata) => React.ReactNode;
}

// Helper to calculate the flex-basis percentage based on column size
const getFlexBasis = (size: number): string => {
  const percentage = (size / 4) * 100; // 4 is max size units per row

  return `${percentage}%`;
};

export function CustomFormLayoutRenderer({
  layout,
  columnMap,
  renderField,
}: CustomFormLayoutRendererProps) {
  // Render a single layout column
  const renderLayoutColumn = useCallback(
    (layoutColumn: LayoutColumn) => {
      // Find the actual column metadata
      const column = columnMap.get(layoutColumn.fieldName);

      // Skip if column doesn't exist or isn't editable
      if (!column || !column.is_editable) {
        return null;
      }

      return (
        <div
          key={layoutColumn.id}
          style={{
            flexBasis: getFlexBasis(layoutColumn.size),
            minWidth: 0,
          }}
        >
          {renderField(column)}
        </div>
      );
    },
    [columnMap, renderField],
  );

  // Render a layout row
  const renderLayoutRow = useCallback(
    (row: LayoutRow) => (
      <div key={row.id} className="space-y-2">
        <If condition={row.columns.length > 0}>
          <div className="flex gap-4">
            {row.columns.map(renderLayoutColumn)}
          </div>
        </If>
      </div>
    ),
    [renderLayoutColumn],
  );

  // Render a layout group
  const renderLayoutGroup = useCallback(
    (group: LayoutGroup) => (
      <Card key={group.id} className="bg-background rounded-md">
        <If condition={!group.isCollapsed}>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium uppercase">
              {group.label}
            </CardTitle>
          </CardHeader>
        </If>

        <If condition={!group.isCollapsed}>
          <CardContent className="space-y-4">
            {group.rows.map(renderLayoutRow)}
          </CardContent>
        </If>
      </Card>
    ),
    [renderLayoutRow],
  );

  return (
    <div className="mx-2 space-y-2">{layout.edit.map(renderLayoutGroup)}</div>
  );
}
