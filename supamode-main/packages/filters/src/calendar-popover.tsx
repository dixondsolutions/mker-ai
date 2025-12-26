import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { useDateFormatter } from '@kit/formatters/hooks';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { cn } from '@kit/ui/utils';

import { useTimezone } from './dates-utils';

/**
 * Calendar popover
 * @param props - The props for the calendar popover
 * @returns The calendar popover
 */
export function CalendarPopover(props: {
  testId?: string;
  date: Date | undefined;
  onChange: (date: string) => void;
  disabled: (date: Date) => boolean;
}) {
  const timezone = useTimezone();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dateFormatter = useDateFormatter();

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid={props.testId}
          variant="secondary"
          size="sm"
          className={cn(
            'w-full justify-start text-left font-normal',
            !props.date && 'text-muted-foreground',
          )}
        >
          {props.date ? (
            dateFormatter(props.date)
          ) : (
            <span className="text-muted-foreground">
              {t('dataExplorer:filters.pickADate')}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          timeZone={timezone}
          mode="single"
          selected={props.date}
          onSelect={(date) => {
            const dateStr = date ? date.toISOString() : '';

            props.onChange(dateStr);
            setOpen(false);
          }}
          disabled={props.disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
