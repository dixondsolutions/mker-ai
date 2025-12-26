import { useCallback, useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { UseFormReturn, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

import type { FlexibleWidgetFormData } from '../../../types/widget-forms';

type MetricConfigFormData = {
  format?: 'number' | 'currency' | 'percentage' | 'decimal';
  suffix?: string;
  showProgress?: boolean;
  comparisonPeriod?:
    | 'none'
    | 'previous_period'
    | 'last_week'
    | 'last_month'
    | 'last_year';
  showTrendArrow?: boolean;
  trendPeriod?: '1d' | '7d' | '30d' | '90d';
  targetValue?: number | null;
  lowThreshold?: number | null;
  highThreshold?: number | null;
  lowColor?: string;
  normalColor?: string;
  highColor?: string;
};

function useMetricConfigForm(config: Record<string, unknown>) {
  const validationSchema = useMemo(
    () =>
      z.object({
        format: z
          .enum(['number', 'currency', 'percentage', 'decimal'])
          .default('number' as const),
        suffix: z.string().optional(),
        showProgress: z.boolean().default(false),
        comparisonPeriod: z
          .enum([
            'none',
            'previous_period',
            'last_week',
            'last_month',
            'last_year',
          ])
          .default('none'),
        showTrendArrow: z.boolean().default(false),
        trendPeriod: z.enum(['1d', '7d', '30d', '90d']).default('7d' as const),
        targetValue: z.number().nullable().optional(),
        lowThreshold: z.number().nullable().optional(),
        highThreshold: z.number().nullable().optional(),
        lowColor: z.string().default('#ef4444'),
        normalColor: z.string().default('#3b82f6'),
        highColor: z.string().default('#22c55e'),
      }),
    [],
  );

  return useForm<MetricConfigFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      format:
        (config['format'] as
          | 'number'
          | 'currency'
          | 'percentage'
          | 'decimal') || 'number',
      suffix: (config['suffix'] as string) || '',
      showProgress: (config['showProgress'] as boolean) || false,
      comparisonPeriod:
        (config['comparisonPeriod'] as
          | 'none'
          | 'previous_period'
          | 'last_week'
          | 'last_month'
          | 'last_year') || 'none',
      showTrendArrow: (config['showTrendArrow'] as boolean) || false,
      trendPeriod:
        (config['trendPeriod'] as '1d' | '7d' | '30d' | '90d') || '7d',
      targetValue: (config['targetValue'] as number) || null,
      lowThreshold: (config['lowThreshold'] as number) || null,
      highThreshold: (config['highThreshold'] as number) || null,
      lowColor: (config['lowColor'] as string) || '#ef4444',
      normalColor: (config['normalColor'] as string) || '#3b82f6',
      highColor: (config['highColor'] as string) || '#22c55e',
    },
  });
}

function NumberFormatField() {
  return (
    <FormField
      name="config.format"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.numberFormat" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="number">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatNumber" />
              </SelectItem>
              <SelectItem value="currency">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatCurrency" />
              </SelectItem>
              <SelectItem value="percentage">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatPercentage" />
              </SelectItem>
              <SelectItem value="decimal">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatDecimal" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function SuffixField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="config.suffix"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.suffix" />
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={t('dashboard:widgetConfig.metric.suffixPlaceholder')}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function ShowProgressField() {
  return (
    <FormField
      name="config.showProgress"
      render={({ field }) => (
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.showProgress" />
          </FormLabel>
        </FormItem>
      )}
    />
  );
}

function ComparisonPeriodField() {
  return (
    <FormField
      name="config.comparisonPeriod"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.comparisonPeriod" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">
                <Trans i18nKey="dashboard:widgetConfig.metric.noComparison" />
              </SelectItem>
              <SelectItem value="previous_period">
                <Trans i18nKey="dashboard:widgetConfig.metric.previousPeriod" />
              </SelectItem>
              <SelectItem value="last_week">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastWeek" />
              </SelectItem>
              <SelectItem value="last_month">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastMonth" />
              </SelectItem>
              <SelectItem value="last_year">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastYear" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function ShowTrendArrowField() {
  return (
    <FormField
      name="config.showTrendArrow"
      render={({ field }) => (
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.showTrendArrow" />
          </FormLabel>
        </FormItem>
      )}
    />
  );
}

function TrendPeriodField() {
  return (
    <FormField
      name="config.trendPeriod"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.trendPeriod" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="1d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period1Day" />
              </SelectItem>
              <SelectItem value="7d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period7Days" />
              </SelectItem>
              <SelectItem value="30d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period30Days" />
              </SelectItem>
              <SelectItem value="90d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period90Days" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function AppearanceSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.appearance" />
      </h4>
      <div className="space-y-4">
        <NumberFormatField />
        <SuffixField />
        <ShowProgressField />
      </div>
    </div>
  );
}

function BehaviorSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.behavior" />
      </h4>
      <div className="space-y-4">
        <ComparisonPeriodField />
        <ShowTrendArrowField />

        <FormField
          name="config.showTrendArrow"
          render={({ field }) => (
            <If condition={field.value}>
              <TrendPeriodField />
            </If>
          )}
        />
      </div>
    </div>
  );
}

function TargetValueField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="config.targetValue"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.targetValue" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.targetValuePlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function LowThresholdField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="config.lowThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.lowThreshold" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.lowThresholdPlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function HighThresholdField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="config.highThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.highThreshold" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.highThresholdPlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function ThresholdColorFields() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <FormField
        name="config.lowColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.lowColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        name="config.normalColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.normalColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        name="config.highColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.highColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

function ThresholdsSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.metric.thresholds" />
      </h4>
      <div className="space-y-4">
        <TargetValueField />

        <div className="grid grid-cols-2 gap-4">
          <LowThresholdField />
          <HighThresholdField />
        </div>

        <ThresholdColorFields />
      </div>
    </div>
  );
}

type MetricWidgetConfigProps =
  | {
      form: UseFormReturn<FlexibleWidgetFormData>;
      config?: never;
      onConfigChange?: never;
    }
  | {
      form?: never;
      config: Record<string, unknown>;
      onConfigChange: (updates: Record<string, unknown>) => void;
    };

export function MetricWidgetConfig(props: MetricWidgetConfigProps) {
  if ('form' in props && props.form) {
    // Parent form mode (wizard step)
    return (
      <div className="space-y-6">
        <AppearanceSection />
        <Separator />
        <BehaviorSection />
        <Separator />
        <ThresholdsSection />
      </div>
    );
  }

  // Standalone mode (advanced config)
  return (
    <StandaloneMetricWidgetConfig
      config={props.config}
      onConfigChange={props.onConfigChange}
    />
  );
}

function StandaloneMetricWidgetConfig({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>;
  onConfigChange: (updates: Record<string, unknown>) => void;
}) {
  const form = useMetricConfigForm(config);

  const handleFormChange = useCallback(
    (value: MetricConfigFormData) => {
      onConfigChange(value as Record<string, unknown>);
    },
    [onConfigChange],
  );

  useEffect(() => {
    const subscription = form.watch(handleFormChange);
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [form, handleFormChange]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <StandaloneAppearanceSection />
        <Separator />
        <StandaloneBehaviorSection />
        <Separator />
        <StandaloneThresholdsSection />
      </div>
    </Form>
  );
}

function StandaloneAppearanceSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.appearance" />
      </h4>
      <div className="space-y-4">
        <StandaloneNumberFormatField />
        <StandaloneSuffixField />
        <StandaloneShowProgressField />
      </div>
    </div>
  );
}

function StandaloneBehaviorSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.behavior" />
      </h4>
      <div className="space-y-4">
        <StandaloneComparisonPeriodField />
        <StandaloneShowTrendArrowField />

        <FormField
          name="showTrendArrow"
          render={({ field }) => (
            <If condition={field.value}>
              <StandaloneTrendPeriodField />
            </If>
          )}
        />
      </div>
    </div>
  );
}

function StandaloneThresholdsSection() {
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">
        <Trans i18nKey="dashboard:widgetConfig.metric.thresholds" />
      </h4>
      <div className="space-y-4">
        <StandaloneTargetValueField />

        <div className="grid grid-cols-2 gap-4">
          <StandaloneLowThresholdField />
          <StandaloneHighThresholdField />
        </div>

        <StandaloneThresholdColorFields />
      </div>
    </div>
  );
}

function StandaloneNumberFormatField() {
  return (
    <FormField
      name="format"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.numberFormat" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="number">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatNumber" />
              </SelectItem>
              <SelectItem value="currency">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatCurrency" />
              </SelectItem>
              <SelectItem value="percentage">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatPercentage" />
              </SelectItem>
              <SelectItem value="decimal">
                <Trans i18nKey="dashboard:widgetConfig.metric.formatDecimal" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function StandaloneSuffixField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="suffix"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.suffix" />
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={t('dashboard:widgetConfig.metric.suffixPlaceholder')}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function StandaloneShowProgressField() {
  return (
    <FormField
      name="showProgress"
      render={({ field }) => (
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.showProgress" />
          </FormLabel>
        </FormItem>
      )}
    />
  );
}

function StandaloneComparisonPeriodField() {
  return (
    <FormField
      name="comparisonPeriod"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.comparisonPeriod" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">
                <Trans i18nKey="dashboard:widgetConfig.metric.noComparison" />
              </SelectItem>
              <SelectItem value="previous_period">
                <Trans i18nKey="dashboard:widgetConfig.metric.previousPeriod" />
              </SelectItem>
              <SelectItem value="last_week">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastWeek" />
              </SelectItem>
              <SelectItem value="last_month">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastMonth" />
              </SelectItem>
              <SelectItem value="last_year">
                <Trans i18nKey="dashboard:widgetConfig.metric.lastYear" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function StandaloneShowTrendArrowField() {
  return (
    <FormField
      name="showTrendArrow"
      render={({ field }) => (
        <FormItem className="flex items-center space-x-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.showTrendArrow" />
          </FormLabel>
        </FormItem>
      )}
    />
  );
}

function StandaloneTrendPeriodField() {
  return (
    <FormField
      name="trendPeriod"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.trendPeriod" />
          </FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="1d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period1Day" />
              </SelectItem>
              <SelectItem value="7d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period7Days" />
              </SelectItem>
              <SelectItem value="30d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period30Days" />
              </SelectItem>
              <SelectItem value="90d">
                <Trans i18nKey="dashboard:widgetConfig.metric.period90Days" />
              </SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  );
}

function StandaloneTargetValueField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="targetValue"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.targetValue" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.targetValuePlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function StandaloneLowThresholdField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="lowThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.lowThreshold" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.lowThresholdPlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function StandaloneHighThresholdField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="highThreshold"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:widgetConfig.metric.highThreshold" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={t(
                'dashboard:widgetConfig.metric.highThresholdPlaceholder',
              )}
              value={field.value || ''}
              onChange={(e) =>
                field.onChange(parseFloat(e.target.value) || null)
              }
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

function StandaloneThresholdColorFields() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <FormField
        name="lowColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.lowColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        name="normalColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.normalColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        name="highColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgetConfig.metric.highColor" />
            </FormLabel>
            <FormControl>
              <Input type="color" {...field} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
