import { useState } from 'react';
import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Trans } from '@kit/ui/trans';

/**
 * Timezone selector
 * @param props - The props
 * @returns The timezone selector
 */
export function TimezoneSelector(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const timezones = useMemo(() => Intl.supportedValuesOf('timeZone'), []);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="timezone-selector-trigger"
          variant={'outline'}
          className="flex w-full justify-start gap-x-2 text-left"
        >
          <span>
            {props.value || <Trans i18nKey={'settings:general.noTimezone'} />}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start">
        <Command>
          <CommandInput
            placeholder={t('settings:general.findTimezone')}
            data-testid="timezone-selector-input"
          />

          <CommandEmpty>
            <Trans i18nKey={'settings:general.noTimezone'} />
          </CommandEmpty>

          <CommandGroup className="max-h-[60vh] overflow-y-auto">
            <CommandList>
              {timezones.map((value) => {
                return (
                  <CommandItem
                    data-testid={`timezone-selector-item-${value}`}
                    tabIndex={0}
                    value={value}
                    key={value}
                    onSelect={() => {
                      props.onChange(value);
                      setOpen(false);
                    }}
                  >
                    {value}
                  </CommandItem>
                );
              })}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
