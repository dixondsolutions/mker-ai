import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { getOperatorsForDataType } from './operators';
import { FilterOperator } from './types';

/**
 * OperatorDropdown component
 * @param operator - The current operator
 * @param onOperatorChange - The function to call when the operator changes
 * @param dataType - The data type of the column
 * @param isEnum - Whether the column is an enum
 */
export function OperatorDropdown({
  operator,
  onOperatorChange,
  dataType,
  isEnum,
}: {
  operator?: string;
  onOperatorChange: (op: FilterOperator) => void;
  dataType: string;
  isEnum?: boolean;
}) {
  const { t } = useTranslation();

  const options = useMemo(
    () => getOperatorsForDataType(dataType, isEnum),
    [dataType, isEnum],
  );

  const value =
    operator && options.includes(operator as FilterOperator) ? operator : 'eq';

  return (
    <Select value={value} onValueChange={onOperatorChange}>
      <SelectTrigger
        tabIndex={-1}
        autoFocus={false}
        data-testid="filter-operator-select"
        className="h-6 w-auto max-w-32 border-transparent px-1.5 text-xs"
      >
        <SelectValue placeholder={t('dataExplorer:operators.eq')} />
      </SelectTrigger>

      <SelectContent>
        {options.map((op) => (
          <SelectItem
            key={op}
            value={op}
            data-testid="filter-operator-option"
            className="h-7 text-xs"
          >
            {t(`dataExplorer:operators.${op}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
