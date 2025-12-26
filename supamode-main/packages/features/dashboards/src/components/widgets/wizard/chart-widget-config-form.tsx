import { useCallback } from 'react';

import { UseFormReturn, useWatch } from 'react-hook-form';

import { ColumnMetadata } from '@kit/types';
import { Form } from '@kit/ui/form';
import { If } from '@kit/ui/if';

import type {
  FlexibleWidgetFormData,
  WidgetFormStepUpdate,
} from '../../../types/widget-forms';
import { SharedSchemaTableFields } from '../shared-widget-fields';
import { ChartDataConfig } from './chart-data-config';

type ChartWidgetConfigFormProps = {
  id: string;
  onSubmit: (updates: WidgetFormStepUpdate) => void;
  columns: ColumnMetadata[];
  schemas: string[];
  tables: Array<{ name: string; displayName: string }>;
  form: UseFormReturn<FlexibleWidgetFormData>;
};

export function ChartWidgetConfigForm({
  id,
  onSubmit,
  columns,
  schemas,
  tables,
  form,
}: ChartWidgetConfigFormProps) {
  const data = useWatch({ control: form.control });

  const handleSchemaChange = useCallback(() => {
    form.setValue('tableName', '');

    // Only reset fields that need to be cleared when schema changes
    // Keep UI preferences but clear data-dependent fields
    form.setValue('config.xAxis', '');
    form.setValue('config.yAxis', '');
    form.setValue('config.groupBy', undefined);
    form.setValue('config.filters', []);
    form.setValue('config.orderBy', []);
  }, [form]);

  const handleTableChange = useCallback(() => {
    // Only reset fields that need to be cleared when table changes
    // Keep UI preferences but clear column-dependent fields
    form.setValue('config.xAxis', '');
    form.setValue('config.yAxis', '');
    form.setValue('config.groupBy', undefined);
    form.setValue('config.filters', []);
    form.setValue('config.orderBy', []);
  }, [form]);

  const hasDataSource = Boolean(data.schemaName && data.tableName);

  return (
    <div className="mx-auto w-full space-y-4">
      <Form {...form}>
        <form
          className="flex flex-col space-y-4"
          id={id}
          onSubmit={form.handleSubmit((formData) => {
            onSubmit({
              schemaName: formData.schemaName,
              tableName: formData.tableName,
              config: formData.config,
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
            <ChartDataConfig data={data} columns={columns} />
          </If>
        </form>
      </Form>
    </div>
  );
}
