import { ReactNode } from 'react';

import { Filter, X } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import { SearchInput } from './search-input';

interface TableFiltersBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  actions?: ReactNode;
  filters?: ReactNode;
  className?: string;
}

export function TableFiltersBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showFilters,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters = false,
  actions,
  filters,
  className,
}: TableFiltersBarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="flex-1">
          <SearchInput
            value={searchValue}
            onValueChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle Button */}
          {onToggleFilters && (
            <Button
              variant="outline"
              onClick={onToggleFilters}
              className="shrink-0"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="shrink-0"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}

          {/* Custom Actions */}
          {actions}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filters && (
        <div className="bg-muted/20 rounded-lg border p-4">{filters}</div>
      )}
    </div>
  );
}
