import type { ControllerRenderProps } from 'react-hook-form';
import { getI18n } from 'react-i18next';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

import type {
  QueryConfigField,
  WidgetConfigField,
} from '../../lib/widget-registry';
import type { WidgetType } from '../../types';

interface ConfigFieldProps {
  field: WidgetConfigField;
  widgetType: WidgetType;
}

export function ConfigField({ field }: ConfigFieldProps) {
  const fieldPath = `config.${field.key}`;

  return (
    <FormField
      name={fieldPath}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>

          <FormControl>{renderConfigFieldInput(field, formField)}</FormControl>

          <FormDescription>{field.description}</FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface QueryConfigFieldProps {
  field: QueryConfigField;
  widgetType: WidgetType;
}

export function QueryConfigField({ field }: QueryConfigFieldProps) {
  const fieldPath = `queryConfig.${field.key}`;

  return (
    <FormField
      name={fieldPath}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>{field.label}</FormLabel>

          <FormControl>{renderQueryFieldInput(field, formField)}</FormControl>

          <FormDescription>{field.description}</FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Helper function to render config field inputs with correct types
function renderConfigFieldInput(
  field: WidgetConfigField,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formField: ControllerRenderProps<any, any>,
) {
  const { t } = getI18n();

  switch (field.type) {
    case 'text':
      return <Input {...formField} />;

    case 'select':
      return (
        <Select
          onValueChange={formField.onChange}
          value={String(formField.value || '')}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t(
                `dashboard:widgets.configPanel.placeholders.select${field.label.replace(/\s/g, '')}`,
              )}
            />
          </SelectTrigger>

          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.labelKey ? (
                  <Trans i18nKey={option.labelKey} />
                ) : (
                  option.label
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'boolean':
      return (
        <Switch
          checked={Boolean(formField.value)}
          onCheckedChange={formField.onChange}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          {...formField}
          onChange={(e) => formField.onChange(Number(e.target.value))}
        />
      );

    case 'color':
      return <Input type="color" {...formField} />;

    default:
      return <Input {...formField} />;
  }
}

// Helper function to render query field inputs with correct types
function renderQueryFieldInput(
  field: QueryConfigField,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formField: ControllerRenderProps<any, any>,
) {
  const { t } = getI18n();

  switch (field.type) {
    case 'column':
      return (
        <Input
          {...formField}
          placeholder={t(
            'dashboard:widgets.configPanel.placeholders.enterColumnName',
          )}
        />
      );

    case 'aggregation':
      return (
        <Select
          onValueChange={formField.onChange}
          value={String(formField.value || '')}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t(
                'dashboard:widgets.configPanel.placeholders.selectAggregation',
              )}
            />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="count">
              <Trans i18nKey="dashboard:widgets.configPanel.aggregationOptions.count" />
            </SelectItem>

            <SelectItem value="sum">
              <Trans i18nKey="dashboard:widgets.configPanel.aggregationOptions.sum" />
            </SelectItem>

            <SelectItem value="avg">
              <Trans i18nKey="dashboard:widgets.configPanel.aggregationOptions.avg" />
            </SelectItem>

            <SelectItem value="min">
              <Trans i18nKey="dashboard:widgets.configPanel.aggregationOptions.min" />
            </SelectItem>

            <SelectItem value="max">
              <Trans i18nKey="dashboard:widgets.configPanel.aggregationOptions.max" />
            </SelectItem>
          </SelectContent>
        </Select>
      );

    case 'limit':
      return (
        <Input
          type="number"
          {...formField}
          onChange={(e) => formField.onChange(Number(e.target.value))}
          min={1}
          max={1000}
        />
      );

    default:
      return <Input {...formField} />;
  }
}
