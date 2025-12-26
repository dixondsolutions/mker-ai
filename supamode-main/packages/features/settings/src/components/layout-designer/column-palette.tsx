import { useState } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { Database, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ColumnMetadata } from '@kit/types';
import { Badge } from '@kit/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { DataTypeIcon } from '@kit/ui/datatype-icon';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { cn } from '@kit/ui/utils';

interface ColumnPaletteProps {
  availableColumns: ColumnMetadata[];
  usedColumns: string[];
}

interface DraggableColumnProps {
  column: ColumnMetadata;
  isUsed: boolean;
}

function DraggableColumn({ column, isUsed }: DraggableColumnProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `available-${column.name}`,
      data: {
        type: 'available-column',
        data: column,
      },
      disabled: isUsed,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative cursor-grab active:cursor-grabbing',
        isDragging && 'rotate-2 opacity-50',
        isUsed && 'cursor-not-allowed opacity-50',
      )}
    >
      <Card
        className={cn(
          'transition-shadow hover:shadow-md',
          isUsed && 'bg-muted/50 border-muted-foreground/20',
          !isUsed && 'hover:border-primary/50',
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <DataTypeIcon
              type={column.ui_config.data_type}
              className="h-4 w-4"
            />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {column.display_name || column.name}
              </div>
              <div className="text-muted-foreground truncate text-xs">
                {column.ui_config.data_type}
              </div>
            </div>
          </div>

          <If condition={column.description}>
            <div className="text-muted-foreground mt-2 line-clamp-2 text-xs">
              {column.description}
            </div>
          </If>

          <div className="mt-2 flex items-center gap-1">
            <If condition={column.is_required}>
              <Badge variant="destructive" className="text-xs">
                {t('settings:layoutDesigner.required')}
              </Badge>
            </If>
            <If condition={!column.is_editable}>
              <Badge variant="secondary" className="text-xs">
                {t('settings:layoutDesigner.readOnly')}
              </Badge>
            </If>
            <If condition={isUsed}>
              <Badge variant="outline" className="text-xs">
                {t('settings:layoutDesigner.inUse')}
              </Badge>
            </If>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ColumnPalette({
  availableColumns,
  usedColumns,
}: ColumnPaletteProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = availableColumns.filter(
    (column) =>
      column.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (column.display_name || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      column.ui_config.data_type
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const allColumns = [...availableColumns];

  const usedColumnObjects = allColumns.filter((col) =>
    usedColumns.includes(col.name),
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-1 flex-col gap-2 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t('settings:layoutDesigner.columnPalette')}
        </CardTitle>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />

          <Input
            placeholder={t('settings:layoutDesigner.searchColumns')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Available Columns */}
        <div>
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">
            {t('settings:layoutDesigner.available')} ({filteredColumns.length})
          </h3>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            <If condition={filteredColumns.length === 0}>
              <div className="text-muted-foreground py-8 text-center">
                <Database className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">
                  {t('settings:layoutDesigner.noColumnsFound')}
                </p>
                <If condition={searchTerm.length > 0}>
                  <p className="text-xs">
                    {t('settings:layoutDesigner.tryAdjustingSearch')}
                  </p>
                </If>
              </div>
            </If>
            {filteredColumns.map((column) => (
              <DraggableColumn
                key={column.name}
                column={column}
                isUsed={false}
              />
            ))}
          </div>
        </div>

        {/* Used Columns */}
        <If condition={usedColumnObjects.length > 0}>
          <div>
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">
              {t('settings:layoutDesigner.inLayout')} (
              {usedColumnObjects.length})
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {usedColumnObjects.map((column) => (
                <DraggableColumn
                  key={column.name}
                  column={column}
                  isUsed={true}
                />
              ))}
            </div>
          </div>
        </If>
      </CardContent>
    </Card>
  );
}
