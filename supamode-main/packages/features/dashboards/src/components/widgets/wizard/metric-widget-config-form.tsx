import { useCallback } from 'react';

import { UseFormReturn, useWatch } from 'react-hook-form';

import { ColumnMetadata } from '@kit/types';
import { Form } from '@kit/ui/form';
import { If } from '@kit/ui/if';

import type {
  FlexibleWidgetFormData,
  WidgetFormStepUpdate,
} from '../../../types/widget-forms';
import {
  ConfigSection,
  SharedSchemaTableFields,
} from '../shared-widget-fields';
import { MetricDataConfig } from './metric-data-config';

type MetricWidgetConfigFormProps = {
  id: string;
  onSubmit: (updates: WidgetFormStepUpdate) => void;
  columns: ColumnMetadata[];
  schemas: string[];
  tables: Array<{ name: string; displayName: string }>;
  form: UseFormReturn<FlexibleWidgetFormData>;
};

export function MetricWidgetConfigForm({
  id,
  onSubmit,
  columns,
  schemas,
  tables,
  form,
}: MetricWidgetConfigFormProps) {
  const data = useWatch({ control: form.control });

  const handleSchemaChange = useCallback(() => {
    form.setValue('tableName', '');

    form.setValue('config', {
      metric: '',
      aggregation: 'count',
      groupBy: undefined,
      filters: [],
    });
  }, [form]);

  const handleTableChange = useCallback(() => {
    form.setValue('config', {
      metric: '',
      aggregation: 'count',
      groupBy: undefined,
      filters: [],
    });
  }, [form]);

  const hasDataSource = Boolean(
    data.schemaName && data.tableName && columns.length > 0,
  );

  return (
    <div className="mx-auto w-full space-y-4">
      <Form {...form}>
        <form
          className="flex flex-col space-y-4"
          id={id}
          onSubmit={form.handleSubmit((formData) => {
            // Validate trend configuration
            const config = (formData.config as Record<string, unknown>) || {};
            const showTrend = config?.['showTrend'];
            const filters =
              (config?.['filters'] as Array<{
                config?: { isTrendFilter?: boolean };
              }>) || [];

            if (showTrend) {
              const hasTrendFilter = filters.some(
                (filter) => filter.config?.isTrendFilter === true,
              );

              if (!hasTrendFilter) {
                form.setError('config.filters', {
                  type: 'required',
                  message:
                    'A date filter is required when trend comparison is enabled',
                });
                return;
              }
            }

            onSubmit({
              schemaName: formData.schemaName,
              tableName: formData.tableName,
              config: formData.config || {},
            });
          })}
        >
          <SharedSchemaTableFields
            hasSchema={Boolean(data.schemaName)}
            schemas={schemas}
            tables={tables}
            onSchemaChange={handleSchemaChange}
            onTableChange={handleTableChange}
          />

          <If condition={hasDataSource}>
            <ConfigSection>
              <MetricDataConfig data={data} columns={columns} />
            </ConfigSection>
          </If>
        </form>
      </Form>
    </div>
  );
}
