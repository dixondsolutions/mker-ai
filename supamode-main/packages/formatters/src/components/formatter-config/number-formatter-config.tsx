import { useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@kit/ui/card';
import { CurrencyPicker } from '@kit/ui/currency-picker';
import { Label } from '@kit/ui/label';
import { Slider } from '@kit/ui/slider';
import { Switch } from '@kit/ui/switch';

export interface NumberFormatterConfigData {
  decimals?: number;
  currency?: string;
  useGrouping?: boolean;
  // Internal fields to match NumberFormatterConfig structure
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface NumberFormatterConfigProps {
  formatterType: string;
  value?: NumberFormatterConfigData;
  onChange: (config: NumberFormatterConfigData) => void;
}

export function NumberFormatterConfig({
  formatterType,
  value = {},
  onChange,
}: NumberFormatterConfigProps) {
  const { t } = useTranslation();

  const currentConfig = useMemo(() => {
    const decimals =
      value?.decimals ??
      (formatterType === 'currency'
        ? 2
        : formatterType === 'percentage'
          ? 1
          : 2);

    return {
      decimals,
      currency: value?.currency ?? 'USD',
      useGrouping: value?.useGrouping ?? true,
      // Map to NumberFormatterConfig structure
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
      ...value,
    };
  }, [formatterType, value]);

  const handleConfigChange = useCallback(
    (updates: Partial<NumberFormatterConfigData>) => {
      onChange({ ...currentConfig, ...updates });
    },
    [currentConfig, onChange],
  );

  return (
    <Card className="mt-2">
      <CardContent className="space-y-4">
        {/* Decimal Places */}
        <div className="space-y-2 pt-4">
          <Label className="text-sm font-medium">
            {t('common:formatters.config.number.decimals.label')}
          </Label>

          <div className="space-y-2">
            <Slider
              min={0}
              max={5}
              step={1}
              value={[currentConfig.decimals || 2]}
              onValueChange={(values) => {
                const decimals = values[0];
                handleConfigChange({
                  decimals,
                  maximumFractionDigits: decimals,
                });
              }}
              className="w-full"
            />

            <div className="text-muted-foreground flex justify-between text-xs">
              <span>0</span>
              <span className="font-mono font-medium">
                {currentConfig.decimals} decimal
                {(currentConfig.decimals || 0) !== 1 ? 's' : ''}
              </span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Currency Options */}
        {formatterType === 'currency' && (
          <div className="space-y-2">
            <CurrencyPicker
              field={{
                ref: () => {},
                name: 'currency',
                value: currentConfig.currency || 'USD',
                onChange: () => {},
                onBlur: () => {},
                disabled: false,
              }}
              value={currentConfig.currency || 'USD'}
              onChange={(value: string) =>
                handleConfigChange({ currency: value })
              }
            />
          </div>
        )}

        {/* Grouping */}
        <div className="flex items-center space-x-2">
          <Switch
            id="useGrouping"
            checked={currentConfig.useGrouping}
            onCheckedChange={(checked) =>
              handleConfigChange({ useGrouping: checked })
            }
          />

          <Label htmlFor="useGrouping" className="text-sm">
            {t('common:formatters.config.number.useGrouping.label')}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
