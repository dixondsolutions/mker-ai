import { useMemo } from 'react';

import { ChevronDown, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';
import { cn } from '@kit/ui/utils';

import {
  NumberFormatterConfig,
  type NumberFormatterConfigData,
} from './number-formatter-config';

export type FormatterConfigData =
  | NumberFormatterConfigData
  | Record<string, unknown>;

interface FormatterConfigPanelProps {
  formatterType?: string;
  configValue?: FormatterConfigData;
  onConfigChange: (config: FormatterConfigData) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function FormatterConfigPanel({
  formatterType,
  configValue = {},
  onConfigChange,
  isOpen = false,
  onOpenChange,
  className,
}: FormatterConfigPanelProps) {
  const { t } = useTranslation();

  // Determine if this formatter type has configuration options
  const hasConfiguration = useMemo(() => {
    return (
      formatterType &&
      [
        'duration',
        'status',
        'number',
        'currency',
        'percentage',
        'compact',
      ].includes(formatterType)
    );
  }, [formatterType]);

  // Don't render if no formatter selected or no config available
  if (!formatterType || !hasConfiguration) {
    return null;
  }

  const renderConfigComponent = () => {
    switch (formatterType) {
      case 'number':
      case 'currency':
      case 'percentage':
      case 'compact':
        return (
          <NumberFormatterConfig
            formatterType={formatterType}
            value={configValue as NumberFormatterConfigData}
            onChange={onConfigChange}
          />
        );

      default:
        return (
          <div className="text-muted-foreground p-4 text-center text-sm">
            {t('common:formatters.config.noConfiguration')}
          </div>
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            type="button"
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />

              <span>
                {t('common:formatters.config.configure', { formatterType })}
              </span>
            </div>

            <ChevronDown
              className={cn(
                'ml-2 h-4 w-4 transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2">
          {renderConfigComponent()}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
