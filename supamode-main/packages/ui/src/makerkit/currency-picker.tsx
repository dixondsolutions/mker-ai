import { useMemo, useState } from 'react';

import { ControllerRenderProps } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../shadcn/command';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '../shadcn/form';
import { Input } from '../shadcn/input';
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/popover';
import { Trans } from './trans';

/**
 * @name CurrencyPicker
 * @description A form for selecting a currency
 * @param props - The props
 * @returns A form for selecting a currency
 */
export function CurrencyPicker(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any>;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const supportedCurrencies = useSupportedCurrencies();
  const value = props.value;

  const label = useMemo(
    () => supportedCurrencies.find((c) => c.code === value)?.name || '',
    [supportedCurrencies, value],
  );

  return (
    <FormItem className="w-full">
      <FormLabel>
        <Trans i18nKey="settings:currency.pickCurrency" />
      </FormLabel>

      <FormControl>
        <Popover modal={true} open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Input
              className="ring-primary w-full text-left focus:ring"
              value={label}
              placeholder={t('settings:currency.pickCurrencyPlaceholder')}
            />
          </PopoverTrigger>

          <PopoverContent className="w-full min-w-[500px]">
            <Command value={value}>
              <CommandInput
                placeholder={t('settings:currency.searchCurrency')}
              />

              <CommandList>
                <CommandEmpty>
                  <Trans i18nKey="settings:currency.noCurrencyFound" />
                </CommandEmpty>

                <CommandGroup className="overflow-y-auto">
                  {supportedCurrencies.map((currency) => (
                    <CommandItem
                      key={currency.code}
                      value={currency.code}
                      onSelect={() => {
                        props.onChange(currency.code);

                        setOpen(false);
                      }}
                    >
                      {currency.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </FormControl>

      <FormDescription>
        <Trans i18nKey="settings:currency.pickCurrencyDescription" />
      </FormDescription>

      <FormMessage />
    </FormItem>
  );
}

/**
 * @name useSupportedCurrencies
 * @description Returns a list of supported currencies
 * @returns A list of supported currencies
 */
function useSupportedCurrencies() {
  const { i18n } = useTranslation();

  function getCurrencyName(amount: number, currency: string) {
    const locale = i18n.resolvedLanguage || 'en-US';

    const options = {
      style: 'currency' as const,
      currency: currency,
      currencyDisplay: 'name' as const,
    };

    return Intl.NumberFormat(locale, options).format(amount);
  }

  const supportedCurrencies = Intl.supportedValuesOf('currency');
  const rx = /(?<= ).+/;

  return supportedCurrencies.map((cur) => {
    const output = getCurrencyName(0, cur);

    return {
      code: cur,
      name: output.match(rx)?.[0] || '',
    };
  });
}
