import type { TFunction } from 'i18next';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ColumnMetadata } from '@kit/types';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Trans } from '@kit/ui/trans';

interface MetricPreviewProps {
  metric: string;
  aggregation: string;
  columns: ColumnMetadata[];
  trendPeriod?: number;
}

export function MetricPreview({
  metric,
  aggregation,
  columns,
  trendPeriod,
}: MetricPreviewProps) {
  const selectedColumn = columns.find((col) => col.name === metric);
  const { t } = useTranslation();

  const description = getMetricDescription({
    aggregation,
    columnName: selectedColumn?.display_name || metric,
    trendPeriod,
    t,
  });

  return (
    <Alert className="mb-4">
      <TrendingUp className="h-4 w-4" />

      <AlertDescription>
        <div className="space-y-1">
          <p className="text-sm font-medium">
            <Trans i18nKey="dashboard:widgets.metric.config.thisWillShow" />:
          </p>

          <p className="text-muted-foreground text-sm">{description}</p>

          <p className="text-muted-foreground text-xs">
            <Trans i18nKey="dashboard:widgets.metric.config.example" />:{' '}
            {getMetricExampleValue({ aggregation, t })}
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Get the description for a metric
 * @param args - The arguments
 * @returns The description
 */
function getMetricDescription(args: {
  aggregation: string;
  columnName: string;
  trendPeriod?: number;
  t: TFunction;
}): string {
  const { aggregation, columnName, trendPeriod, t } = args;

  let description: string;

  switch (aggregation) {
    case 'count':
      description = t('dashboard:widgets.metric.config.descriptions.count');
      break;
    case 'sum':
      description = t('dashboard:widgets.metric.config.descriptions.sum', {
        columnName,
      });
      break;
    case 'avg':
      description = t('dashboard:widgets.metric.config.descriptions.avg', {
        columnName,
      });
      break;
    case 'min':
      description = t('dashboard:widgets.metric.config.descriptions.min', {
        columnName,
      });
      break;
    case 'max':
      description = t('dashboard:widgets.metric.config.descriptions.max', {
        columnName,
      });
      break;
    default:
      description = t('dashboard:widgets.metric.config.descriptions.generic', {
        aggregation,
        columnName,
      });
      break;
  }

  if (trendPeriod && trendPeriod !== 0) {
    description += t('dashboard:widgets.metric.config.trendSuffix', {
      days: trendPeriod,
    });
  }

  return description;
}

/**
 * Get the example value for a metric
 * @param args - The arguments
 * @returns The example value
 */
function getMetricExampleValue(args: {
  aggregation: string;
  t: TFunction;
}): string {
  const { aggregation, t } = args;

  switch (aggregation) {
    case 'count':
      return t('dashboard:widgets.metric.config.examples.count');
    case 'sum':
      return t('dashboard:widgets.metric.config.examples.sum');
    case 'avg':
      return t('dashboard:widgets.metric.config.examples.avg');
    case 'min':
    case 'max':
      return t('dashboard:widgets.metric.config.examples.minmax');
    default:
      return t('dashboard:widgets.metric.config.examples.calculated');
  }
}
