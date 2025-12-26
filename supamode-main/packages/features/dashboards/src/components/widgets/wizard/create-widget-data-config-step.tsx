import { UseFormReturn, useWatch } from 'react-hook-form';

import {
  useAccessibleSchemas,
  useSchemaTables,
  useTableColumns,
} from '../../../hooks/use-table-metadata';
import type {
  FlexibleWidgetFormData,
  WidgetFormStepUpdate,
} from '../../../types/widget-forms';
import { ChartWidgetConfigForm } from './chart-widget-config-form';
import { MetricWidgetConfigForm } from './metric-widget-config-form';
import { TableWidgetConfigForm } from './table-widget-config-form';

type CreateWidgetStepDataConfigProps = {
  id: string;
  onSubmit: (updates: WidgetFormStepUpdate) => void;
  form: UseFormReturn<FlexibleWidgetFormData>;
};

const ChartTypes = {
  TABLE: 'table',
  METRIC: 'metric',
  CHART: 'chart',
} as const;

export function CreateWidgetStepDataConfig({
  id,
  onSubmit,
  form,
}: CreateWidgetStepDataConfigProps) {
  const { data: schemas = [] } = useAccessibleSchemas();
  const data = useWatch({ control: form.control });
  const { data: tables = [] } = useSchemaTables(data.schemaName || '');

  const { data: columns } = useTableColumns(
    data.schemaName || '',
    data.tableName || '',
  );

  switch (data.type) {
    case ChartTypes.CHART:
      return (
        <ChartWidgetConfigForm
          id={id}
          onSubmit={onSubmit}
          columns={columns}
          schemas={schemas}
          tables={tables}
          form={form}
        />
      );

    case ChartTypes.METRIC:
      return (
        <MetricWidgetConfigForm
          id={id}
          onSubmit={onSubmit}
          columns={columns}
          schemas={schemas}
          tables={tables}
          form={form}
        />
      );

    case ChartTypes.TABLE:
      return (
        <TableWidgetConfigForm
          id={id}
          onSubmit={onSubmit}
          columns={columns}
          schemas={schemas}
          tables={tables}
          form={form}
        />
      );

    default:
      return null;
  }
}
