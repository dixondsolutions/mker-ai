import { useCallback, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { cn } from '@kit/ui/utils';

import {
  type FormatterConfigData,
  FormatterConfigPanel,
} from './formatter-config/formatter-config-panel';

export interface FormatterOption {
  name: string;
  type: string;
  label: string;
  description?: string;
  example?: string;
  category?: 'number' | 'date' | 'text' | 'custom' | 'other';
}

interface FormatterSelectProps {
  value?: string;
  onChange: (value: string) => void;
  formatters: FormatterOption[];
  dataType?: string;
  label?: string;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  previewValue?: unknown;
  onPreview?: (
    formatter: string,
    value: unknown,
    config?: FormatterConfigData,
  ) => string;
  // Configuration support
  configValue?: FormatterConfigData;
  onConfigChange?: (config: FormatterConfigData) => void;
  showConfiguration?: boolean;
}

/**
 * Formatter selection component
 * Allows users to select from available formatters with preview
 */
export function FormatterSelect({
  value,
  onChange,
  formatters,
  dataType,
  label,
  placeholder,
  className,
  showPreview = false,
  previewValue,
  onPreview,
  configValue,
  onConfigChange,
  showConfiguration = true,
}: FormatterSelectProps) {
  const { t } = useTranslation();
  const [configPanelOpen, setConfigPanelOpen] = useState<boolean>(false);

  const defaultPlaceholder =
    placeholder || t('common:formatters.selection.placeholder');

  // Group formatters by category
  const groupedFormatters = useMemo(() => {
    const groups: Record<string, FormatterOption[]> = {
      number: [],
      date: [],
      text: [],
      custom: [],
      other: [],
    };

    formatters.forEach((formatter) => {
      const category = formatter.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(formatter);
    });

    // Remove empty groups
    Object.keys(groups).forEach((key) => {
      if (groups[key]?.length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [formatters]);

  // Get selected formatter
  const selectedFormatter = useMemo(() => {
    return formatters.find((f) => f.name === value);
  }, [formatters, value]);

  // Generate sample data for preview
  const getSampleData = useCallback(
    (formatterName: string, dataType?: string) => {
      if (previewValue !== undefined) {
        return previewValue;
      }

      // Generate sample data based on formatter type and data type
      const type = dataType?.toLowerCase();

      switch (formatterName) {
        case 'duration':
          return 150000; // 2.5 minutes in milliseconds
        case 'status':
          return 'active';
        case 'currency':
          return 1234.56;
        case 'percentage':
          return 0.456;
        case 'compact':
          return 1234567;
        case 'date':
          return new Date();
        case 'datetime':
          return new Date();
        case 'time':
          return new Date();
        case 'relative':
          return new Date(Date.now() - 86400000); // 1 day ago
        case 'email':
          return 'user@example.com';
        case 'url':
          return 'https://example.com';
        case 'phone':
          return '1234567890';
        case 'boolean':
          return true;
        default:
          // Generate based on data type
          if (
            type?.includes('int') ||
            type?.includes('numeric') ||
            type?.includes('decimal')
          ) {
            return 42;
          }
          if (type?.includes('timestamp') || type?.includes('date')) {
            return new Date();
          }
          if (type?.includes('bool')) {
            return true;
          }
          return 'Sample text';
      }
    },
    [previewValue],
  );

  const sampleData = useMemo<{
    sampleValue: unknown;
    sampleError: boolean;
  }>(() => {
    if (!showPreview || !value) {
      return { sampleValue: undefined, sampleError: false };
    }

    try {
      return {
        sampleValue: getSampleData(value, dataType),
        sampleError: false,
      };
    } catch {
      return { sampleValue: undefined, sampleError: true };
    }
  }, [showPreview, value, getSampleData, dataType]);

  const { sampleValue, sampleError } = sampleData;

  const preview = useMemo(() => {
    if (!showPreview || !value || !onPreview) {
      return '';
    }

    if (sampleError) {
      return t('common:formatters.preview.errorFormatting');
    }

    try {
      return onPreview(value, sampleValue, configValue);
    } catch {
      return t('common:formatters.preview.errorFormatting');
    }
  }, [showPreview, value, onPreview, sampleError, sampleValue, configValue, t]);

  const sampleDisplay =
    sampleValue !== undefined && sampleValue !== null
      ? String(sampleValue)
      : undefined;

  // Category labels with i18n
  const categoryLabels: Record<string, string> = {
    number: t('common:formatters.categories.number'),
    date: t('common:formatters.categories.date'),
    text: t('common:formatters.categories.text'),
    custom: t('common:formatters.categories.custom'),
    other: t('common:formatters.categories.other'),
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={defaultPlaceholder}>
            {selectedFormatter && (
              <div className="flex items-center gap-2">
                <span>{selectedFormatter.label}</span>
                {selectedFormatter.example && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedFormatter.example}
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {Object.entries(groupedFormatters).map(([category, items]) => (
            <SelectGroup key={category}>
              <SelectLabel>{categoryLabels[category] || category}</SelectLabel>
              {items.map((formatter) => (
                <SelectItem
                  key={formatter.name}
                  value={formatter.name}
                  className="flex flex-col items-start py-2"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{formatter.label}</span>
                    {formatter.example && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {formatter.example}
                      </Badge>
                    )}
                  </div>

                  {formatter.description && (
                    <span className="text-muted-foreground mt-1 text-xs">
                      {formatter.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Configuration Panel */}
      {showConfiguration && value && onConfigChange && (
        <FormatterConfigPanel
          formatterType={value}
          configValue={configValue}
          onConfigChange={onConfigChange}
          isOpen={configPanelOpen}
          onOpenChange={setConfigPanelOpen}
        />
      )}

      {/* Preview section */}
      {showPreview && (
        <>
          {preview ? (
            <div className="mt-4 space-y-1">
              <div className="text-xs">
                <span className="text-muted-foreground">
                  {t('common:formatters.preview.sampleInput')}{' '}
                </span>

                <code className="bg-background rounded px-1.5 py-0.5 text-xs">
                  {sampleDisplay}
                </code>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">
                  {t('common:formatters.preview.formattedOutput')}{' '}
                </span>

                <span className="font-medium">{preview}</span>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs italic">
              {t('common:formatters.preview.selectFormatter')}
            </span>
          )}
        </>
      )}

      {/* Data type hint */}
      {dataType && !value && (
        <p className="text-muted-foreground text-xs">
          {t('common:formatters.selection.recommendedFor', { dataType })}
        </p>
      )}
    </div>
  );
}

/**
 * Hook to get formatter options for a specific data type
 */
export function useFormatterOptions(
  dataType?: string,
  customFormatters?: FormatterOption[],
): FormatterOption[] {
  return useMemo(() => {
    // Base formatters based on data type
    const baseFormatters: FormatterOption[] = [];

    // Add type-specific formatters
    if (dataType) {
      const type = dataType.toLowerCase();

      // Number types
      if (
        [
          'integer',
          'bigint',
          'decimal',
          'numeric',
          'real',
          'double precision',
        ].includes(type)
      ) {
        baseFormatters.push(
          {
            name: 'number',
            type: 'number',
            label: 'Number',
            example: '1,234.56',
            category: 'number',
          },
          {
            name: 'currency',
            type: 'currency',
            label: 'Currency',
            example: '$1,234.56',
            category: 'number',
          },
          {
            name: 'percentage',
            type: 'percentage',
            label: 'Percentage',
            example: '45.6%',
            category: 'number',
          },
          {
            name: 'compact',
            type: 'compact',
            label: 'Compact',
            example: '1.2K',
            category: 'number',
          },
          {
            name: 'bytes',
            type: 'bytes',
            label: 'File Size',
            example: '1.5 MB',
            category: 'custom',
          },
          {
            name: 'duration',
            type: 'duration',
            label: 'Duration',
            example: '2h 30m',
            category: 'custom',
          },
        );
      }

      // Date types
      if (
        ['date', 'timestamp', 'timestamptz', 'time', 'timetz'].includes(type)
      ) {
        baseFormatters.push(
          {
            name: 'date',
            type: 'date',
            label: 'Date',
            example: 'Jan 15, 2024',
            category: 'date',
          },
          {
            name: 'datetime',
            type: 'datetime',
            label: 'Date & Time',
            example: 'Jan 15, 2024 3:30 PM',
            category: 'date',
          },
          {
            name: 'time',
            type: 'time',
            label: 'Time',
            example: '3:30 PM',
            category: 'date',
          },
          {
            name: 'relative',
            type: 'relative',
            label: 'Relative',
            example: '2 days ago',
            category: 'date',
          },
        );
      }

      // Text types
      if (['text', 'varchar', 'char', 'citext'].includes(type)) {
        baseFormatters.push(
          {
            name: 'text',
            type: 'text',
            label: 'Text',
            example: 'Sample text',
            category: 'text',
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email',
            example: 'user@example.com',
            category: 'text',
          },
          {
            name: 'url',
            type: 'url',
            label: 'URL',
            example: 'example.com',
            category: 'text',
          },
          {
            name: 'phone',
            type: 'phone',
            label: 'Phone',
            example: '(555) 123-4567',
            category: 'text',
          },
          {
            name: 'status',
            type: 'status',
            label: 'Status',
            example: '✓ Active',
            category: 'custom',
          },
        );
      }

      // Boolean types
      if (['boolean', 'bool'].includes(type)) {
        baseFormatters.push(
          {
            name: 'boolean',
            type: 'boolean',
            label: 'Yes/No',
            example: 'Yes',
            category: 'other',
          },
          {
            name: 'status',
            type: 'status',
            label: 'Status Badge',
            example: '✓ Enabled',
            category: 'custom',
          },
        );
      }
    }

    // Add custom formatters
    if (customFormatters) {
      baseFormatters.push(...customFormatters);
    }

    // Remove duplicates by name
    const seen = new Set<string>();
    return baseFormatters.filter((formatter) => {
      if (seen.has(formatter.name)) {
        return false;
      }
      seen.add(formatter.name);
      return true;
    });
  }, [dataType, customFormatters]);
}
