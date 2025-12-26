import { useCallback, useEffect, useMemo, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormState, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { formatRecord } from '@kit/formatters';
import { ColumnMetadata, RecordLayoutConfig, RelationConfig } from '@kit/types';
import { Card, CardContent } from '@kit/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { toast } from '@kit/ui/sonner';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { createFieldSchema } from '../../utils/create-field-schema';
import { getFieldPlaceholder } from '../../utils/field-placeholder';
import { hasRenderableFields } from '../../utils/layout-utils';
import { CustomFormLayoutRenderer } from './custom-form-layout-renderer';
import { useFormBlocker } from './hooks/use-form-blocker';
import { RecordFormControl } from './record-form-control';
import { RecordValueProvider } from './record-value-context';

interface RecordFormProps {
  fields: ColumnMetadata[];
  recordData: Record<string, unknown>;
  allowCreateRelation?: boolean;
  id?: string;
  mode: 'create' | 'edit';
  relations: RelationConfig[];
  isSubmitting: boolean;
  className?: string;
  schema?: string;
  table?: string;
  customLayout?: RecordLayoutConfig;

  foreignRecords?: Record<
    string,
    {
      displayFormat: string;
      data: Record<string, unknown>;
    }
  >;

  onSubmit: (data: Record<string, unknown>) => Promise<void>;

  onChange?: (
    data: Record<string, unknown>,
    formState: FormState<Record<string, unknown>>,
  ) => void;

  onCancel: () => void;
}

/**
 * Record form component
 * @param fields - The fields to display in the form
 * @param recordData - The data to display in the form
 * @param onSubmit - The function to call when the form is saved
 * @param onChange - The function to call when the form is changed
 * @param relations - The relations to display in the form
 * @param isSubmitting - Whether the form is submitting
 * @param className - The class name to apply to the form
 * @param allowCreateRelation - Whether to allow creating relations
 * @param id - The id of the form
 * @param foreignRecords
 *
 */
export function RecordForm({
  id = 'record-form',
  allowCreateRelation = true,
  className = '',
  foreignRecords,
  fields,
  recordData,
  onSubmit,
  onChange,
  relations,
  isSubmitting = false,
  schema,
  table,
  customLayout,
}: RecordFormProps) {
  const { t } = useTranslation();

  // Create refs map for field elements
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Create a dynamic schema based on the fields
  const formSchema = useMemo(() => {
    const schemaObj: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
      if (field.is_editable) {
        const isRelation = relations.some(
          (relation) => relation.source_column === field.name,
        );

        // Create the base schema for this field type
        schemaObj[field.name] = createFieldSchema(field, isRelation);
      }
    });

    return z.object(schemaObj);
  }, [fields, relations]);

  const editableFields = useMemo(() => {
    return fields
      .filter((f) => f.is_editable)
      .sort((a, b) => (a.ordering ?? 0) - (b.ordering ?? 0));
  }, [fields]);

  // Check if we have a custom layout for edit mode with actual editable fields
  const hasCustomLayout = useMemo(() => {
    if (!customLayout) {
      return false;
    }

    // Check if the custom layout actually has renderable fields
    return hasRenderableFields(customLayout, fields, 'edit');
  }, [customLayout, fields]);

  // Create a map of column names to column metadata for custom layout rendering
  const columnMap = useMemo(() => {
    const map = new Map<string, ColumnMetadata>();

    fields.forEach((col) => {
      map.set(col.name, col);
    });

    return map;
  }, [fields]);

  // Create form with react-hook-form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: recordData,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  // Create ref callback for a field
  const setFieldRef = useCallback(
    (fieldName: string) => (element: HTMLDivElement | null) => {
      fieldRefs.current[fieldName] = element;
    },
    [],
  );

  // Check if the form has unsaved changes
  const hasUnsavedChanges = Object.keys(form.formState.dirtyFields).length > 0;

  const values = useWatch({ control: form.control });
  const formState = form.formState;

  // Call the onChange function when the form is changed
  useEffect(() => {
    if (onChange) {
      onChange(values, formState);
    }
  }, [values, formState, onChange]);

  // block the form if it has unsaved changes or is submitting
  useFormBlocker({
    hasUnsavedChanges,
    isSubmitting,
  });

  // Helper function to render a single field
  const renderField = useCallback(
    (field: ColumnMetadata) => {
      const relationConfig = relations.find(
        (r) => r.source_column === field.name,
      );

      const schemaTable = [
        relationConfig?.target_schema,
        relationConfig?.target_table,
      ].join('.');

      const foreignRecord = foreignRecords?.[schemaTable];
      const maxLength = field.ui_config?.max_length;

      return (
        <Card
          key={field.name}
          ref={setFieldRef(field.name)}
          data-testid="record-form-field"
          className="flex items-start gap-x-8 border-transparent bg-transparent py-2.5"
        >
          <CardContent className="w-full p-0">
            <FormField
              control={form.control}
              name={field.name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground flex w-full flex-1 items-center justify-between gap-x-2">
                    <span>
                      {field.display_name || field.name}{' '}
                      <span className="text-destructive text-xs">
                        {field.is_required && !field.default_value ? '*' : null}
                      </span>
                    </span>

                    <If condition={maxLength}>
                      <span
                        className={cn(
                          'text-muted-foreground text-xs',
                          form.formState.errors[field.name]?.type ===
                            'max_length' && 'text-destructive',
                        )}
                      >
                        {String(formField.value || '').length}/{maxLength}
                      </span>
                    </If>
                  </FormLabel>

                  <FormControl>
                    <RecordFormControl
                      field={field}
                      placeholder={getFieldPlaceholder(field)}
                      formField={{
                        ...formField,
                        disabled: !field.is_editable || isSubmitting,
                      }}
                      relationConfig={relationConfig}
                      relation={{
                        column: field.name,
                        original: recordData[field.name],
                        formatted: foreignRecord?.displayFormat
                          ? formatRecord(
                              foreignRecord.displayFormat,
                              foreignRecord.data,
                            )
                          : null,
                        link: null,
                      }}
                      allowCreateRelation={allowCreateRelation}
                      schema={schema}
                      table={table}
                    />
                  </FormControl>

                  <If condition={field.description}>
                    <FormDescription>{field.description}</FormDescription>
                  </If>

                  <FormMessage
                    data-testid="field-error"
                    data-field-name={field.name}
                  />

                  <div>
                    <If
                      condition={
                        form.formState.errors[field.name] &&
                        (field.default_value || !field.is_required)
                      }
                    >
                      <button
                        type="button"
                        className="text-muted-foreground flex items-center gap-x-1 text-xs hover:underline"
                        onClick={() => {
                          // first, set the value to an empty string to update the input
                          form.setValue(field.name, '', {
                            shouldDirty: true,
                            shouldValidate: true,
                            shouldTouch: true,
                          });

                          setTimeout(() => {
                            // then clear the value to trigger the validation
                            form.setValue(field.name, null, {
                              shouldDirty: true,
                              shouldValidate: true,
                              shouldTouch: true,
                            });
                          }, 0);
                        }}
                      >
                        <span>
                          {t('dataExplorer:record.clearValueToApplyDefault')}
                        </span>
                      </button>
                    </If>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      );
    },
    [
      relations,
      foreignRecords,
      setFieldRef,
      form,
      isSubmitting,
      recordData,
      allowCreateRelation,
      schema,
      table,
      t,
    ],
  );

  const DefaultLayout = useMemo(() => {
    return (
      <div
        className={
          'bg-background mx-2 flex flex-col space-y-2.5 rounded-md border p-4'
        }
      >
        {editableFields.map((field) => renderField(field))}
      </div>
    );
  }, [editableFields, renderField]);

  if (!editableFields.length) {
    return (
      <p className="text-muted-foreground text-sm">
        <Trans i18nKey="dataExplorer:record.noEditableFields" />
      </p>
    );
  }

  return (
    <div className={cn(className)}>
      <RecordValueProvider value={recordData}>
        <div>
          <Form {...form}>
            <form
              id={id}
              className="space-y-4"
              onSubmit={(event) => {
                event.stopPropagation();

                if (isSubmitting) {
                  return event.preventDefault();
                }

                const errors = form.formState.errors;

                if (Object.keys(errors).length > 0) {
                  toast.error(t(`dataExplorer:hasErrors`));

                  return event.preventDefault();
                }

                return form.handleSubmit(async (data) => {
                  // we need to create a new object with the updated values
                  const updatedValues: typeof data = {};

                  // Only include dirty fields in the payload
                  for (const field of Object.keys(form.formState.dirtyFields)) {
                    // Skip non-editable fields
                    const fieldMetadata = [...editableFields].find(
                      (f) => f.name === field,
                    );

                    // if the field is editable, add it to the values object
                    if (fieldMetadata && fieldMetadata.is_editable) {
                      updatedValues[field] = data[field];
                    }
                  }

                  // if no field was changed, do not call onSave
                  if (Object.keys(updatedValues).length === 0) {
                    toast.error(t(`dataExplorer:record.noChanges`));

                    return form.trigger();
                  }

                  await onSubmit(updatedValues);
                })(event);
              }}
            >
              <div className="flex max-w-full flex-col gap-8">
                <If
                  condition={hasCustomLayout && customLayout}
                  fallback={DefaultLayout}
                >
                  {(layout) => (
                    <CustomFormLayoutRenderer
                      layout={layout}
                      columnMap={columnMap}
                      renderField={renderField}
                    />
                  )}
                </If>
              </div>
            </form>
          </Form>
        </div>
      </RecordValueProvider>
    </div>
  );
}
