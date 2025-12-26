import { useState } from 'react';

import { SearchIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';

/**
 * Search input
 * @param props - The props for the search input
 * @returns The search input
 */
export function SearchInput(props: {
  search: string;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(props.search);

  if (value !== props.search) {
    setValue(props.search);
  }

  return (
    <div className="relative flex items-center gap-x-2" key={value}>
      <SearchIcon className="text-muted-foreground absolute left-1 h-3.5 w-3.5" />

      <Input
        id={'filters-search-input'}
        data-testid={'filters-search-input'}
        placeholder={t('dataExplorer:filters.searchAll')}
        className={'hover:border-border h-7 border-transparent pl-6 text-sm'}
        defaultValue={value}
        onKeyDown={(e) => {
          const value = (e.target as HTMLInputElement).value.trim();
          const onEnter = e.key === 'Enter';

          if (onEnter) {
            props.onSearchChange(value);
          }
        }}
      />

      <If condition={props.search}>
        <ClearSearchButton onClear={props.onClear} />
      </If>
    </div>
  );
}

function ClearSearchButton(props: { onClear: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="hover:bg-muted/50 absolute right-1 top-0.5 h-6 w-6 rounded-full p-0 focus:ring-0"
          onClick={props.onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </TooltipTrigger>

      <TooltipContent>
        <Trans i18nKey="dataExplorer:filters.clearSearch" />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * @name clearSearchInput
 */
export function clearSearchInput() {
  const inputElement = document.querySelector('#filters-search-input');

  if (inputElement) {
    (inputElement as HTMLInputElement).value = '';
  }
}
