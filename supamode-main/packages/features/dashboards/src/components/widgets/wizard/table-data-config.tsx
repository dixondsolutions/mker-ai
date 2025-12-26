import { useCallback, useId, useMemo } from 'react';

import { X } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { ColumnMetadata } from '@kit/types';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel } from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

import type { FlexibleWidgetFormData } from '../../../types/widget-forms';

interface TableDataConfigProps {
  data: Partial<FlexibleWidgetFormData>;
  columns: ColumnMetadata[];
  form: UseFormReturn<FlexibleWidgetFormData>;
}

const SORT_DIRECTIONS = [
  { value: 'asc', labelKey: 'dashboard:widgets.table.config.ascending' },
  { value: 'desc', labelKey: 'dashboard:widgets.table.config.descending' },
];

export function TableDataConfig({ data, columns, form }: TableDataConfigProps) {
  const sortById = useId();
  const sortDirectionId = useId();

  const config = data.config as Record<string, unknown>;

  const selectedColumns = useMemo(
    () => (config?.['columns'] as string[]) || [],
    [config],
  );

  const handleColumnToggle = useCallback(
    (columnName: string, checked: boolean) => {
      const currentColumns = selectedColumns || [];

      if (checked) {
        if (!currentColumns.includes(columnName)) {
          form.setValue('config.columns', [...currentColumns, columnName], {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }
      } else {
        form.setValue(
          'config.columns',
          currentColumns.filter((col) => col !== columnName),
          {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          },
        );
      }
    },
    [selectedColumns, form],
  );

  const handleRemoveColumn = useCallback(
    (columnName: string) => {
      handleColumnToggle(columnName, false);
    },
    [handleColumnToggle],
  );

  return (
    <div className="mx-auto space-y-4">
      <ColumnSelectionCard
        columns={columns}
        selectedColumns={selectedColumns}
        onColumnToggle={handleColumnToggle}
        onRemoveColumn={handleRemoveColumn}
      />

      <SortingConfigurationCard
        data={data}
        columns={columns}
        selectedColumns={selectedColumns}
        sortById={sortById}
        sortDirectionId={sortDirectionId}
      />
    </div>
  );
}

interface ColumnSelectionCardProps {
  columns: ColumnMetadata[];
  selectedColumns: string[];
  onColumnToggle: (columnName: string, checked: boolean) => void;
  onRemoveColumn: (columnName: string) => void;
}

function ColumnSelectionCard({
  columns,
  selectedColumns,
  onColumnToggle,
  onRemoveColumn,
}: ColumnSelectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.table.config.columnSelection" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <If condition={selectedColumns.length === 0}>
          <div className="space-y-2 py-8 text-center">
            <p className="text-muted-foreground text-sm">
              <Trans i18nKey="dashboard:widgets.table.config.allColumnsSelected" />
            </p>

            <p className="text-muted-foreground text-xs">
              <Trans i18nKey="dashboard:widgets.table.config.selectSpecificColumns" />
            </p>
          </div>
        </If>

        <If condition={selectedColumns.length > 0}>
          <SelectedColumnsDisplay
            columns={columns}
            selectedColumns={selectedColumns}
            onRemoveColumn={onRemoveColumn}
          />
        </If>

        <AvailableColumnsList
          columns={columns}
          selectedColumns={selectedColumns}
          onColumnToggle={onColumnToggle}
        />
      </CardContent>
    </Card>
  );
}

interface SelectedColumnsDisplayProps {
  columns: ColumnMetadata[];
  selectedColumns: string[];
  onRemoveColumn: (columnName: string) => void;
}

function SelectedColumnsDisplay({
  columns,
  selectedColumns,
  onRemoveColumn,
}: SelectedColumnsDisplayProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {selectedColumns.map((columnName) => (
        <ColumnBadge
          key={columnName}
          column={columns.find((c) => c.name === columnName)}
          columnName={columnName}
          onRemove={() => onRemoveColumn(columnName)}
        />
      ))}
    </div>
  );
}

interface ColumnBadgeProps {
  column?: ColumnMetadata;
  columnName: string;
  onRemove: () => void;
}

function ColumnBadge({ column, columnName, onRemove }: ColumnBadgeProps) {
  return (
    <Badge variant="secondary" className="flex items-center gap-2">
      <span>{column?.display_name || columnName}</span>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-4 w-4"
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

interface AvailableColumnsListProps {
  columns: ColumnMetadata[];
  selectedColumns: string[];
  onColumnToggle: (columnName: string, checked: boolean) => void;
}

function AvailableColumnsList({
  columns,
  selectedColumns,
  onColumnToggle,
}: AvailableColumnsListProps) {
  return (
    <div className="space-y-2">
      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
        {columns.map((column) => (
          <ColumnCheckboxItem
            key={column.name}
            column={column}
            isSelected={selectedColumns.includes(column.name)}
            onToggle={(checked) => onColumnToggle(column.name, checked)}
          />
        ))}
      </div>
    </div>
  );
}

interface ColumnCheckboxItemProps {
  column: ColumnMetadata;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
}

function ColumnCheckboxItem({
  column,
  isSelected,
  onToggle,
}: ColumnCheckboxItemProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`column-${column.name}`}
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(!!checked)}
      />

      <Label
        htmlFor={`column-${column.name}`}
        className="flex flex-1 cursor-pointer items-center gap-2 text-sm"
      >
        <span className="font-medium">
          {column.display_name || column.name}
        </span>

        <span className="text-muted-foreground text-xs">
          ({column.ui_config?.data_type || 'unknown'})
        </span>
      </Label>
    </div>
  );
}

interface SortingConfigurationCardProps {
  columns: ColumnMetadata[];
  selectedColumns: string[];
  sortById: string;
  sortDirectionId: string;
  data: Partial<FlexibleWidgetFormData>;
}

function SortingConfigurationCard({
  columns,
  selectedColumns,
  sortById,
  sortDirectionId,
  data,
}: SortingConfigurationCardProps) {
  const config = data.config as Record<string, unknown>;
  const sortBy = config?.['sortBy'] as string;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.table.config.sortingOptional" />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <SortBySelector
          columns={columns}
          selectedColumns={selectedColumns}
          sortById={sortById}
        />

        <SortDirectionSelector
          sortDirectionId={sortDirectionId}
          showDirection={!!sortBy}
        />
      </CardContent>
    </Card>
  );
}

interface SortBySelectorProps {
  columns: ColumnMetadata[];
  selectedColumns: string[];
  sortById: string;
}

function SortBySelector({
  columns,
  selectedColumns,
  sortById,
}: SortBySelectorProps) {
  const { t } = useTranslation();
  const none = 'none';

  // Use all columns if none are selected, otherwise use selected columns
  const columnsToShow =
    selectedColumns.length === 0 ? columns.map((c) => c.name) : selectedColumns;

  return (
    <FormField
      name="config.sortBy"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgets.table.config.sortByColumn" />

            <span className="text-muted-foreground ml-1">
              <Trans i18nKey="dashboard:widgets.table.config.optional" />
            </span>
          </FormLabel>

          <FormControl>
            <Select
              value={field.value || none}
              onValueChange={(value) =>
                field.onChange(value === none ? null : value)
              }
            >
              <SelectTrigger id={sortById}>
                <SelectValue
                  placeholder={t(
                    'dashboard:widgets.table.config.selectColumnToSortBy',
                  )}
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={none}>
                  <Trans i18nKey="dashboard:widgets.table.config.noSorting" />
                </SelectItem>

                {columnsToShow.map((columnName) => {
                  const column = columns.find((c) => c.name === columnName);

                  return (
                    <SelectItem key={columnName} value={columnName}>
                      {column?.display_name || columnName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  );
}

interface SortDirectionSelectorProps {
  sortDirectionId: string;
  showDirection: boolean;
}

function SortDirectionSelector({
  sortDirectionId,
  showDirection,
}: SortDirectionSelectorProps) {
  const { t } = useTranslation();

  if (!showDirection) return null;

  return (
    <FormField
      name="config.sortDirection"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgets.table.config.sortDirection" />
          </FormLabel>

          <FormControl>
            <Select value={field.value || 'asc'} onValueChange={field.onChange}>
              <SelectTrigger id={sortDirectionId}>
                <SelectValue
                  placeholder={t(
                    'dashboard:widgets.table.config.selectSortDirection',
                  )}
                />
              </SelectTrigger>

              <SelectContent>
                {SORT_DIRECTIONS.map((direction) => (
                  <SelectItem key={direction.value} value={direction.value}>
                    <Trans i18nKey={direction.labelKey} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  );
}
