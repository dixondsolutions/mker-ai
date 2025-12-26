import { useCallback } from 'react';

import type {
  ColumnPinningState,
  VisibilityState,
} from '@tanstack/react-table';
import { Columns, Eye, EyeOff, Pin, PinOff } from 'lucide-react';

import type { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Separator } from '@kit/ui/separator';
import { cn } from '@kit/ui/utils';

interface ColumnManagementPopoverProps {
  /** Available columns metadata */
  columns: ColumnMetadata[];
  /** Current column visibility state */
  columnVisibility: VisibilityState;
  /** Current column pinning state */
  columnPinning: ColumnPinningState;
  /** Callback to toggle column visibility */
  onToggleVisibility: (columnId: string) => void;
  /** Callback to toggle column pinning */
  onTogglePin: (columnId: string, side?: 'left' | 'right') => void;
  /** Function to check if column is pinned */
  isColumnPinned: (columnId: string) => 'left' | 'right' | false;
  /** Optional callback to reset all preferences */
  onResetPreferences?: () => void;
}

export function ColumnManagementPopover({
  columns,
  columnVisibility,
  columnPinning,
  onToggleVisibility,
  onTogglePin,
  isColumnPinned,
  onResetPreferences,
}: ColumnManagementPopoverProps) {
  // Filter to only show columns that are configured to be visible in table
  const visibleColumns = columns.filter((col) => col.is_visible_in_table);

  const handleToggleVisibility = useCallback(
    (columnId: string) => {
      onToggleVisibility(columnId);
    },
    [onToggleVisibility],
  );

  const handleTogglePin = useCallback(
    (columnId: string) => {
      // Default to left side pinning
      onTogglePin(columnId, 'left');
    },
    [onTogglePin],
  );

  const getTotalPinnedColumns = useCallback(() => {
    return (
      (columnPinning.left?.length || 0) + (columnPinning.right?.length || 0)
    );
  }, [columnPinning]);

  const getVisibleColumnsCount = useCallback(() => {
    return visibleColumns.filter((col) => columnVisibility[col.name] !== false)
      .length;
  }, [visibleColumns, columnVisibility]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-6 w-6 p-0"
          data-testid="column-management-trigger"
        >
          <Columns className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Columns</h4>
              <p className="text-muted-foreground text-xs">
                {getVisibleColumnsCount()} of {visibleColumns.length} visible
                {getTotalPinnedColumns() > 0 &&
                  ` • ${getTotalPinnedColumns()} pinned`}
              </p>
            </div>
            {onResetPreferences && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetPreferences}
                className="h-6 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          <Separator className="mb-2" />

          <div className="max-h-80 space-y-1 overflow-y-auto">
            {visibleColumns.map((column) => {
              const isVisible = columnVisibility[column.name] !== false;
              const pinnedSide = isColumnPinned(column.name);
              const isPinned = Boolean(pinnedSide);

              return (
                <div
                  key={column.name}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1.5 transition-colors',
                    'hover:bg-muted/50',
                    isPinned && 'bg-muted/30 border-muted-foreground/20 border',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <Label
                      className={cn(
                        'block cursor-pointer truncate text-sm',
                        !isVisible && 'text-muted-foreground line-through',
                      )}
                      onClick={() => handleToggleVisibility(column.name)}
                    >
                      {column.display_name || column.name}
                    </Label>
                    {isPinned && pinnedSide && (
                      <p className="text-muted-foreground text-xs capitalize">
                        Pinned {pinnedSide}
                      </p>
                    )}
                  </div>

                  <div className="ml-2 flex items-center space-x-1">
                    {/* Visibility Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleToggleVisibility(column.name)}
                      data-testid={`visibility-toggle-${column.name}`}
                    >
                      {isVisible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="text-muted-foreground h-3 w-3" />
                      )}
                    </Button>

                    {/* Pin Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn('h-6 w-6 p-0', isPinned && 'text-primary')}
                      onClick={() => handleTogglePin(column.name)}
                      disabled={!isVisible}
                      data-testid={`pin-toggle-${column.name}`}
                    >
                      {isPinned ? (
                        <Pin className="h-3 w-3" />
                      ) : (
                        <PinOff className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleColumns.length === 0 && (
            <div className="text-muted-foreground py-8 text-center">
              <Columns className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No columns available</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
