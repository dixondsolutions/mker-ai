import { useCallback, useEffect } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { ControllerRenderProps, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ColumnMetadata } from '@kit/types';
import { BADGE_VARIANTS, Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CurrencyPicker } from '@kit/ui/currency-picker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
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
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import { StorageBucketSelect } from '../../../../../data-explorer/src/components/record/storage-bucket-select';
import {
  FullColumnMetadataSchema,
  FullColumnMetadataSchemaType,
} from '../../../api/schemas';

const TEXT_DATA_TYPE_OPTIONS = [
  { label: 'plainText', value: 'text' },
  { label: 'longText', value: 'longtext' },
  { label: 'email', value: 'email' },
  { label: 'url', value: 'url' },
  { label: 'color', value: 'color' },
  { label: 'markdown', value: 'markdown' },
  { label: 'html', value: 'html' },
  { label: 'phone', value: 'phone' },
  { label: 'file', value: 'file' },
  { label: 'image', value: 'image' },
  { label: 'audio', value: 'audio' },
  { label: 'video', value: 'video' },
];

const NUMBER_DATA_TYPE_OPTIONS = [
  { label: 'number', value: 'number' },
  { label: 'currency', value: 'currency' },
  { label: 'percentage', value: 'percentage' },
];

const DATE_DATA_TYPE_OPTIONS = [
  { label: 'date', value: 'date' },
  { label: 'datetime', value: 'datetime' },
  { label: 'time', value: 'time' },
];

const CODE_DATA_TYPE_OPTIONS = [{ label: 'code', value: 'code' }];

const BOOLEAN_DATA_TYPE_OPTIONS = [{ label: 'switch', value: 'switch' }];

const UUID_DATA_TYPE_OPTIONS = [{ label: 'uuid', value: 'uuid' }];

// UI Data Type options mapping - simplified
const UI_DATA_TYPE_OPTIONS: Record<string, { label: string; value: string }[]> =
  {
    text: TEXT_DATA_TYPE_OPTIONS,
    ['character varying']: TEXT_DATA_TYPE_OPTIONS,
    integer: NUMBER_DATA_TYPE_OPTIONS,
    float: NUMBER_DATA_TYPE_OPTIONS,
    decimal: NUMBER_DATA_TYPE_OPTIONS,
    numeric: NUMBER_DATA_TYPE_OPTIONS,
    double: NUMBER_DATA_TYPE_OPTIONS,
    boolean: BOOLEAN_DATA_TYPE_OPTIONS,
    uuid: UUID_DATA_TYPE_OPTIONS,
    date: DATE_DATA_TYPE_OPTIONS,
    timestamp: DATE_DATA_TYPE_OPTIONS,
    ['timestamp with time zone']: DATE_DATA_TYPE_OPTIONS,
    json: CODE_DATA_TYPE_OPTIONS,
    jsonb: CODE_DATA_TYPE_OPTIONS,
  };

type EditColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: ColumnMetadata;
};

/**
 * @name EditColumnMetadataDialog
 * @description A dialog for editing the metadata of a column
 * @param props - The props
 * @returns A dialog for editing the metadata of a column
 */
export function EditColumnMetadataDialog({
  open,
  onOpenChange,
  column,
}: EditColumnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="settings:editColumn"
              values={{ name: column.name }}
            />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:editColumnDescription" />
          </DialogDescription>
        </DialogHeader>

        <EditColumnMetadataForm column={column} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * @name EditColumnMetadataForm
 * @description A form for editing the metadata of a column
 * @param props - The props
 * @returns A form for editing the metadata of a column
 */
function EditColumnMetadataForm(props: {
  column: EditColumnDialogProps['column'];
  onOpenChange: EditColumnDialogProps['onOpenChange'];
}) {
  const fetcher = useFetcher<{ success: boolean }>();
  const { t } = useTranslation();
  const { column, onOpenChange } = props;

  const isSubmitting = fetcher.state === 'submitting';

  const form = useForm({
    resolver: zodResolver(FullColumnMetadataSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      ...column,
      display_name: column.display_name || '',
      description: column.description || '',
      is_required: column.is_required ?? false,
      is_visible_in_table: column.is_visible_in_table ?? true,
      is_visible_in_detail: column.is_visible_in_detail ?? true,
      is_searchable: column.is_searchable ?? true,
      is_sortable: column.is_sortable ?? true,
      is_filterable: column.is_filterable ?? true,
      is_editable: column.is_editable ?? true,
      default_value: column.default_value || null,
      ui_config: {
        ...column.ui_config,
        ui_data_type:
          column.ui_config?.ui_data_type ??
          getDefaultDataType(column.ui_config?.data_type || ''),
        ui_data_type_config: column.ui_config?.ui_data_type_config || {},
        enum_badges: column.ui_config?.enum_badges || {},
        boolean_labels: column.ui_config?.boolean_labels || {},
        enable_smart_suggestions:
          column.ui_config?.enable_smart_suggestions ?? false,
      },
    },
  });

  const uiDataType = useWatch({
    control: form.control,
    name: 'ui_config.ui_data_type',
  });

  const isEditable = useWatch({
    control: form.control,
    name: 'is_editable',
  });

  const defaultValue = column.default_value;

  const enumValues = column.ui_config.enum_values;

  // Check if making field non-editable would prevent insertions
  const wouldPreventInsertions =
    !isEditable && column.is_required && (!defaultValue || defaultValue === '');

  function onSubmit(column: FullColumnMetadataSchemaType) {
    return fetcher.submit(
      {
        intent: 'update-table-columns-config',
        data: {
          [column.name]: column,
        },
      },
      {
        method: 'POST',
        encType: 'application/json',
      },
    );
  }

  useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
    }
  }, [fetcher.data?.success, onOpenChange]);

  return (
    <Form {...form}>
      <form
        data-testid="edit-column-metadata-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div>
          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:displayName" />
                </FormLabel>

                <FormControl>
                  <Input
                    data-testid="edit-column-metadata-form-display-name"
                    placeholder={t('settings:displayNamePlaceholder')}
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="settings:displayNameDescription" />
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* UI Data Type Select */}
        <FormField
          control={form.control}
          name="ui_config.ui_data_type"
          render={({ field }) => {
            // Get the underlying postgres type from UI config
            const pgTypeRaw = column.ui_config?.data_type || '';
            const pgType = pgTypeRaw.toLowerCase();

            // Check if it's a USER-DEFINED type (enum)
            const isEnum = pgType.includes('user-defined');

            // Initialize options with a fallback
            let options = [{ label: 'plainText', value: 'text' }];

            // Find options more flexibly
            if (pgType && UI_DATA_TYPE_OPTIONS[pgType]) {
              options = UI_DATA_TYPE_OPTIONS[pgType];
            } else if (pgType && !isEnum) {
              // Try to find a matching key
              const matchingKey = Object.keys(UI_DATA_TYPE_OPTIONS).find(
                (key) => pgType.includes(key) || key.includes(pgType),
              );

              if (matchingKey && UI_DATA_TYPE_OPTIONS[matchingKey]) {
                options = UI_DATA_TYPE_OPTIONS[matchingKey] || options;
              }
            }

            // Translate option labels
            const translatedOptions = options.map((opt) => ({
              value: opt.value,
              label: t(`settings:dataTypeLabels.${opt.label}`, {
                defaultValue: opt.label,
              }),
            }));

            // Check if there's only one option
            const hasOnlyOneOption = translatedOptions.length === 1;

            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:uiDataType" />
                </FormLabel>

                <FormControl>
                  {isEnum ? (
                    <div className="flex items-center space-x-2">
                      <input
                        data-testid="edit-column-metadata-form-ui-data-type-enum"
                        type="text"
                        className="bg-muted block w-full rounded border px-3 py-2 text-sm"
                        value={t('settings:enumSelectPlaceholder')}
                        disabled
                      />

                      <span className="text-muted-foreground text-xs">
                        <Trans i18nKey="settings:enumDescription" />
                      </span>
                    </div>
                  ) : hasOnlyOneOption ? (
                    <div className="flex items-center space-x-2">
                      <input
                        data-testid="edit-column-metadata-form-ui-data-type-enum"
                        type="text"
                        className="bg-muted block w-full rounded border px-3 py-2 text-sm"
                        value={translatedOptions[0]?.label || 'Default'}
                        disabled
                      />

                      <span className="text-muted-foreground text-xs">
                        <Trans i18nKey="settings:singleOptionDescription" />
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger data-testid="edit-column-metadata-form-ui-data-type-select-trigger">
                        <SelectValue placeholder={t('settings:selectType')} />
                      </SelectTrigger>

                      <SelectContent>
                        {translatedOptions.map((opt) => (
                          <SelectItem
                            data-testid="edit-column-metadata-form-ui-data-type-select-item"
                            key={opt.value}
                            value={opt.value}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>

                <FormDescription>
                  {isEnum
                    ? t('settings:enumDescription')
                    : hasOnlyOneOption
                      ? t('settings:singleOptionDescription')
                      : t('settings:uiDataTypeDescription')}
                </FormDescription>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <If condition={uiDataType}>
          {(uiDataType) => (
            <If condition={doesDataTypeHaveConfig(uiDataType)}>
              <FormField
                control={form.control}
                name="ui_config.ui_data_type_config"
                render={({ field }) => (
                  <DataTypeConfigForm dataType={uiDataType} field={field} />
                )}
              />
            </If>
          )}
        </If>

        <If
          condition={
            uiDataType === 'switch' ||
            (uiDataType === '' &&
              column.ui_config?.data_type?.toLowerCase() === 'boolean')
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ui_config.boolean_labels.true_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:trueLabelText" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t('settings:trueLabelPlaceholder')}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:trueLabelDescription" />
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ui_config.boolean_labels.false_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="settings:falseLabelText" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder={t('settings:falseLabelPlaceholder')}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans i18nKey="settings:falseLabelDescription" />
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </If>

        {enumValues && enumValues.length > 0 && (
          <div className="space-y-2">
            <FormLabel>
              <Trans i18nKey="settings:enumBadges" />
            </FormLabel>

            {enumValues.map((value) => (
              <div key={value} className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      form.getValues(
                        `ui_config.enum_badges.${value}.variant`,
                      ) || 'secondary'
                    }
                    className="gap-x-1"
                  >
                    <span className="truncate text-xs">{value}</span>
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`ui_config.enum_badges.${value}.variant`}
                    render={({ field }) => (
                      <Select
                        value={field.value || 'secondary'}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('settings:selectVariant')}
                          />
                        </SelectTrigger>

                        <SelectContent>
                          {BADGE_VARIANTS.map((variant) => (
                            <SelectItem key={variant} value={variant}>
                              {variant}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:description" />
              </FormLabel>

              <FormControl>
                <Textarea
                  placeholder={t('settings:descriptionPlaceholder')}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:descriptionDescription" />
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="is_visible_in_table"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:visibleInTable" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:visibleInTableDescription" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_visible_in_detail"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:visibleInDetail" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:visibleInDetailDescription" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_searchable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:searchable" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:searchableDescription" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_sortable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:sortable" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:sortableDescription" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_filterable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:filterable" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:filterableDescription" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_editable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    <Trans i18nKey="settings:editable" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:editableDescription" />
                  </FormDescription>

                  <If condition={wouldPreventInsertions}>
                    <p className="text-destructive text-[0.7rem]">
                      <Trans i18nKey="settings:nonEditableWarning" />
                    </p>
                  </If>
                </div>

                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <If condition={shouldShowSmartSuggestions(uiDataType)}>
            <FormField
              control={form.control}
              name="ui_config.enable_smart_suggestions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>
                      <Trans i18nKey="settings:enableSmartSuggestions" />
                    </FormLabel>

                    <FormDescription>
                      <Trans i18nKey="settings:enableSmartSuggestionsDescription" />
                    </FormDescription>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </If>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              <Trans i18nKey="settings:cancel" />
            </Button>
          </DialogClose>

          <Button
            disabled={isSubmitting || !form.formState.isDirty}
            type="submit"
          >
            {isSubmitting ? (
              <Trans i18nKey="settings:saving" />
            ) : (
              <Trans i18nKey="settings:saveChanges" />
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Get the default data type for a column
 * @param dataType - The data type of the column
 * @returns The default data type for the column
 */
function getDefaultDataType(dataType: string) {
  const pgType = dataType.toLowerCase();

  // For user-defined types (enums), we special case to 'enum'
  if (pgType.includes('user-defined')) {
    return 'enum';
  }

  const columnType = UI_DATA_TYPE_OPTIONS[pgType];

  if (columnType && columnType.length > 0) {
    return columnType[0]?.value ?? 'text';
  }

  // If we can't determine the type, default to text
  return 'text';
}

/**
 * @name DataTypeConfigForm
 * @description A form for configuring the data type of a column
 * @param props - The props
 * @returns A form for configuring the data type of a column
 */
function DataTypeConfigForm(props: {
  dataType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any>;
}) {
  switch (props.dataType) {
    case 'currency':
      return <CurrencyConfigForm field={props.field} />;

    case 'file':
    case 'image':
      return (
        <FileUploadConfigForm field={props.field} dataType={props.dataType} />
      );

    default:
      return null;
  }
}

/**
 * @name CurrencyConfigForm
 * @description A form for configuring the currency of a column
 * @param props - The props
 * @returns A form for configuring the currency of a column
 */
function CurrencyConfigForm(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any>;
}) {
  return (
    <CurrencyPicker
      field={props.field}
      value={props.field.value.currency || ''}
      onChange={(value) => {
        props.field.onChange(
          {
            currency: value,
          },
          {
            shouldValidate: true,
          },
        );
      }}
    />
  );
}

/**
 * @name FileUploadConfigForm
 * @description A form for configuring the file upload of a column
 * @param props - The props
 * @returns A form for configuring the file upload of a column
 */
function FileUploadConfigForm(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any>;
  dataType: string;
}) {
  const isImage = props.dataType === 'image';

  // change this to change the default max file size
  const mbByDefault = 1;

  const defaultValues = {
    storage_bucket: '',
    storage_path_template: '{filename}.{extension}',
    allowed_file_types: isImage
      ? ['image/jpeg', 'image/png', 'image/webp']
      : [],
    // 1MB by default
    max_file_size: mbByDefault * 1024 * 1024,
  };

  // Get current config or set defaults
  let currentConfig = props.field.value as {
    storage_bucket: string;
    storage_path_template: string;
    allowed_file_types: string[];
    replace_existing: boolean;
    max_file_size: number;
  };

  // merge the current config with the default values
  currentConfig = {
    ...defaultValues,
    ...currentConfig,
  };

  const updateConfig = useCallback(
    (updates: Partial<typeof currentConfig>) => {
      props.field.onChange(
        {
          ...currentConfig,
          ...updates,
        },
        {
          shouldValidate: true,
        },
      );
    },
    [currentConfig, props.field],
  );

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h4 className="mb-2 text-sm font-medium">
          <Trans i18nKey="settings:fileUploadConfiguration" />
        </h4>

        <p className="text-muted-foreground text-xs">
          <Trans i18nKey="settings:fileUploadConfigDescription" />
        </p>
      </div>

      {/* Storage Bucket */}
      <div>
        <label className="text-sm font-medium">
          <Trans i18nKey="settings:storageBucket" />
        </label>

        <div className="mt-1">
          <StorageBucketSelect
            value={currentConfig.storage_bucket}
            onValueChange={(value) => updateConfig({ storage_bucket: value })}
            placeholder="Select a bucket..."
          />
        </div>

        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="settings:storageBucketDescription" />
        </p>
      </div>

      {/* Storage Path Template */}
      <div>
        <label className="text-sm font-medium">
          <Trans i18nKey="settings:storagePathTemplate" />
        </label>

        <Input
          type="text"
          placeholder={currentConfig.storage_path_template}
          value={currentConfig.storage_path_template}
          onChange={(e) =>
            updateConfig({ storage_path_template: e.target.value })
          }
          className="mt-1"
        />

        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="settings:storagePathTemplateDescription" />
        </p>
      </div>

      {/* Allowed File Types */}
      <div>
        <label className="text-sm font-medium">
          <Trans i18nKey="settings:allowedFileTypes" />
        </label>

        <Input
          type="text"
          placeholder={
            isImage
              ? 'image/jpeg, image/png, image/webp'
              : 'application/pdf, text/plain, image/*'
          }
          value={currentConfig.allowed_file_types.join(', ')}
          onChange={(e) => {
            const types = e.target.value
              .split(',')
              .map((type) => type.trim())
              .filter(Boolean);

            updateConfig({ allowed_file_types: types });
          }}
          className="mt-1"
        />

        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="settings:allowedFileTypesDescription" />
        </p>
      </div>

      {/* Max File Size */}
      <div>
        <label className="text-sm font-medium">
          <Trans i18nKey="settings:maxFileSize" />
        </label>

        <Input
          type="number"
          min="1"
          max="100"
          placeholder="10"
          value={Math.round(currentConfig.max_file_size / 1024 / 1024)}
          onChange={(e) => {
            const sizeInMB = parseInt(e.target.value) || 10;
            updateConfig({ max_file_size: sizeInMB * 1024 * 1024 });
          }}
          className="mt-1"
        />

        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="settings:maxFileSizeDescription" />
        </p>
      </div>

      {/* Replace Existing */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <label className="text-sm font-medium">
            <Trans i18nKey="settings:replaceExisting" />
          </label>

          <p className="text-muted-foreground text-xs">
            <Trans i18nKey="settings:replaceExistingDescription" />
          </p>
        </div>

        <Switch
          checked={currentConfig.replace_existing}
          onCheckedChange={(checked) =>
            updateConfig({ replace_existing: checked })
          }
        />
      </div>
    </div>
  );
}

/**
 * Check if a data type should show smart suggestions option
 * @param dataType - The UI data type to check
 * @returns True if the data type supports smart suggestions, false otherwise
 */
function shouldShowSmartSuggestions(dataType: string | null | undefined) {
  if (!dataType) return false;

  // Smart suggestions are useful for short text fields where users
  // might want to reuse existing values (names, categories, tags, etc.)
  // Exclude long text fields as they typically contain unique content
  const shortTextualTypes = [
    'text', // Plain text - good for names, titles, categories
    'email', // Email addresses - domains and patterns
    'url', // URLs - common domains, paths
    'phone', // Phone numbers - area codes, formats
    'color', // Color values - brand colors, common hex codes
  ];

  return shortTextualTypes.includes(dataType);
}

/**
 * Check if a data type has a config
 * @param dataType - The data type to check
 * @returns True if the data type has a config, false otherwise
 */
function doesDataTypeHaveConfig(dataType: string) {
  return [
    'currency',
    'file',
    'image',
    // TODO: Add more data types here
  ].includes(dataType);
}
