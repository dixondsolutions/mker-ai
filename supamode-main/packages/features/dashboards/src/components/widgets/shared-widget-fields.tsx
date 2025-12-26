import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

interface SchemaFieldProps {
  schemas: string[];
  onSchemaChange: () => void;
}

export function SchemaField({ schemas, onSchemaChange }: SchemaFieldProps) {
  const { t } = useTranslation();

  return (
    <FormField
      name="schemaName"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            <Trans i18nKey="dashboard:labels.schema" />
            <span className="text-destructive ml-1">*</span>
          </FormLabel>

          <FormControl>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                onSchemaChange();
              }}
              value={field.value}
            >
              <SelectTrigger data-testid="widget-schema-select">
                <SelectValue
                  placeholder={t('dashboard:widgets.placeholders.selectSchema')}
                />
              </SelectTrigger>

              <SelectContent>
                {schemas.map((schema) => (
                  <SelectItem
                    key={schema}
                    value={schema}
                    data-testid={`schema-option-${schema}`}
                  >
                    {schema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TableFieldProps {
  tables: Array<{ name: string; displayName: string }>;
  onTableChange: () => void;
}

export function TableField({ tables, onTableChange }: TableFieldProps) {
  const { t } = useTranslation();

  return (
    <FormField
      name="tableName"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            <Trans i18nKey="dashboard:labels.table" />
            <span className="text-destructive ml-1">*</span>
          </FormLabel>

          <FormControl>
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                onTableChange();
              }}
              value={field.value}
            >
              <SelectTrigger data-testid="widget-table-select">
                <SelectValue
                  placeholder={t('dashboard:widgets.placeholders.selectTable')}
                />
              </SelectTrigger>

              <SelectContent>
                {tables.map((table) => (
                  <SelectItem
                    key={table.name}
                    value={table.name}
                    data-testid={`table-option-${table.name}`}
                  >
                    {table.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SharedSchemaTableFieldsProps {
  hasSchema: boolean;
  schemas: string[];
  tables: Array<{ name: string; displayName: string }>;
  onSchemaChange: () => void;
  onTableChange: () => void;
}

export function SharedSchemaTableFields({
  hasSchema,
  schemas,
  tables,
  onSchemaChange,
  onTableChange,
}: SharedSchemaTableFieldsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.placeholders.dataSource" />
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex gap-x-2.5">
          <SchemaField schemas={schemas} onSchemaChange={onSchemaChange} />

          <If condition={hasSchema && tables.length > 0}>
            <TableField tables={tables} onTableChange={onTableChange} />
          </If>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfigSection({ children }: React.PropsWithChildren) {
  return <div className="space-y-6">{children}</div>;
}
