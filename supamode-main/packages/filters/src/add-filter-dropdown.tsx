import { useNavigation } from 'react-router';

import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@kit/ui/command';
import { DataTypeIcon } from '@kit/ui/datatype-icon';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';

export function AddFilterDropdown(props: {
  columns: ColumnMetadata[];
  onSelect: (column: ColumnMetadata) => void;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { t } = useTranslation();
  const isNavigating = useNavigation().state !== 'idle';

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          disabled={isNavigating}
          data-testid="add-filter-button"
          variant="outline"
          className="m-0 h-6 gap-x-1 border-dashed px-2 py-0 shadow-none"
          size="sm"
        >
          <span>{t('dataExplorer:filters.addFilter')}</span>
          <Plus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            data-testid="filter-column-search"
            placeholder={t('dataExplorer:filters.typeFilterName')}
          />

          <CommandEmpty>
            {t('dataExplorer:filters.noFiltersFound')}
          </CommandEmpty>

          <CommandGroup className="max-h-[40vh] overflow-y-auto">
            {props.columns.map((column) => (
              <CommandItem
                tabIndex={0}
                key={column.name}
                data-testid="filter-column-option"
                className="focus:bg-muted flex cursor-pointer items-center gap-x-2.5"
                onSelect={() => {
                  props.onSelect(column);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    props.onSelect(column);
                  }
                }}
              >
                <DataTypeIcon
                  className={'text-muted-foreground h-3 w-3'}
                  type={column.ui_config.data_type}
                />

                <span>{column.display_name ?? column.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
