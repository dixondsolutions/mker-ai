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
import { TableDataConfig } from './table-data-config';

type TableWidgetConfigFormProps = {
  id: string;
  onSubmit: (updates: WidgetFormStepUpdate) => void;
  columns: ColumnMetadata[];
  schemas: string[];
  tables: Array<{ name: string; displayName: string }>;
  form: UseFormReturn<FlexibleWidgetFormData>;
};

export function TableWidgetConfigForm({
  id,
  onSubmit,
  columns,
  schemas,
  tables,
  form,
}: TableWidgetConfigFormProps) {
  const data = useWatch({ control: form.control });

  const handleSchemaChange = useCallback(() => {
    form.setValue('tableName', '');

    form.setValue('config', {
      columns: [],
      sortBy: '',
      sortDirection: 'asc',
      pageSize: 25,
      showSearch: true,
      refreshInterval: 0,
    });
  }, [form]);

  const handleTableChange = useCallback(() => {
    form.setValue('config', {
      columns: [],
      sortBy: '',
      sortDirection: 'asc',
      pageSize: 25,
      showSearch: true,
      refreshInterval: 0,
    });
  }, [form]);

  const hasDataSource = Boolean(
    data.schemaName && data.tableName && columns.length > 0,
  );

  return (
    <div className="mx-auto w-full space-y-4">
      <Form {...form}>
        <form
          className="space-y-4"
          id={id}
          onSubmit={form.handleSubmit((formData) => {
            const config = formData.config || {};

            onSubmit({
              schemaName: formData.schemaName,
              tableName: formData.tableName,
              config,
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
              <TableDataConfig data={data} columns={columns} form={form} />
            </ConfigSection>
          </If>
        </form>
      </Form>
    </div>
  );
}
