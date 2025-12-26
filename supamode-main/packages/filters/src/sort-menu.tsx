import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  SortAscIcon,
  SortDescIcon,
  XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@kit/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@kit/ui/dropdown-menu';
import { cn } from '@kit/ui/utils';

import { SortDirection, SortState } from './types';

export function SortMenu({
  columns,
  currentSort,
  onSortChange,
  onClearSort,
}: {
  columns: ColumnMetadata[];
  currentSort: SortState & {
    columnName: string | undefined | null;
  };
  onSortChange: (column: string, direction: SortDirection) => void;
  onClearSort: () => void;
}) {
  const { t } = useTranslation();

  if (columns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="sort-menu-button"
          data-test-column={currentSort?.column}
          data-test-direction={currentSort?.direction}
          size="sm"
          variant="outline"
          className={cn('m-0 h-6 gap-x-1 px-2 py-0 shadow-none', {
            'border-primary': currentSort?.column,
          })}
        >
          {currentSort.column && currentSort.direction ? (
            <span className="flex items-center gap-x-1">
              <ArrowUpDownIcon className={'text-primary h-3 w-3'} />

              <span>
                {t('dataExplorer:filters.sort')} {currentSort.columnName}
              </span>

              {currentSort.direction === 'asc' ? (
                <SortAscIcon className="h-3 w-3" />
              ) : (
                <SortDescIcon className="h-3 w-3" />
              )}
            </span>
          ) : (
            <span className="flex items-center gap-x-1">
              <ArrowUpDownIcon className="h-3 w-3" />

              <span>{t('dataExplorer:filters.sort')}</span>

              <SortAscIcon className="h-3 w-3" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="max-h-[50vh] min-w-64 overflow-y-auto pb-0"
        collisionPadding={20}
      >
        {columns.map((column) => (
          <DropdownMenuItem
            data-testid="sort-column-option"
            key={column.name}
            className={cn(
              'group/item flex cursor-pointer justify-between text-xs',
              {
                'text-primary hover:text-primary hover:border-primary hover:bg-muted border':
                  currentSort?.column === column.name,
              },
            )}
            onClick={() => {
              if (currentSort?.column === column.name) {
                const newDirection =
                  currentSort.direction === 'asc' ? 'desc' : 'asc';

                onSortChange(column.name, newDirection);
              } else {
                onSortChange(column.name, 'asc');
              }
            }}
          >
            <span>{column.display_name || column.name}</span>

            <span className="flex items-center transition-all group-hover/item:-rotate-180">
              {currentSort?.column === column.name &&
                (currentSort.direction === 'asc' ? (
                  <ArrowUpIcon className="h-3 w-3" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3" />
                ))}
            </span>
          </DropdownMenuItem>
        ))}

        {currentSort && (
          <div className="bg-popover/80 sticky bottom-[0] z-10 mt-1 h-8 border-t py-0.5 backdrop-blur-sm">
            <DropdownMenuItem
              onClick={onClearSort}
              className="text-xs"
              data-testid="clear-sort-button"
            >
              <XIcon className="mr-2 h-3 w-3" />
              <span>{t('dataExplorer:filters.clearSort')}</span>
            </DropdownMenuItem>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
