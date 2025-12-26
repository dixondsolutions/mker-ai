import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';

import { RelativeDateOption } from './types';

/**
 * RelativeDateSelector component for showing relative date options
 */
export function RelativeDateSelector({
  value,
  onChange,
  onCustomDateSelect,
}: {
  value: RelativeDateOption | null;
  onChange: (option: RelativeDateOption) => void;
  onCustomDateSelect?: () => void;
}) {
  const { t } = useTranslation();

  const relativeDateOptions: RelativeDateOption[] = [
    'today',
    'yesterday',
    'tomorrow',
    'thisWeek',
    'lastWeek',
    'nextWeek',
    'thisMonth',
    'lastMonth',
    'last7Days',
    'last30Days',
    'thisYear',
    'lastYear',
  ];

  return (
    <Select
      value={value || 'custom'}
      onValueChange={(option) => {
        if (option === 'custom') {
          onCustomDateSelect?.();
        } else {
          onChange(option as RelativeDateOption);
        }
      }}
    >
      <SelectTrigger
        className="h-7 w-full text-xs"
        data-testid="relative-date-trigger"
      >
        <SelectValue
          placeholder={t('dataExplorer:filters.relativeDateSelect')}
        />
      </SelectTrigger>

      <SelectContent>
        {relativeDateOptions.map((option) => (
          <SelectItem
            data-testid="relative-date-option"
            className="h-7 text-xs"
            key={option}
            value={option}
          >
            {t(`dataExplorer:relativeDates.${option}`)}
          </SelectItem>
        ))}

        <Separator />

        <SelectItem
          value="custom"
          className="h-7 text-xs"
          data-testid="custom-date-option"
        >
          {t('dataExplorer:filters.customDate')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
