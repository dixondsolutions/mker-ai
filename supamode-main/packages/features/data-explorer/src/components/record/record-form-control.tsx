import {
  lazy,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { ControllerRenderProps, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Subject, debounceTime, filter, map } from 'rxjs';
import z from 'zod';

import { formatRecord } from '@kit/formatters';
import { useDateFormatter } from '@kit/formatters/hooks';
import { useAccountPreferences, useGetDate } from '@kit/shared/hooks';
import { ColumnMetadata, RelationConfig } from '@kit/types';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@kit/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import {
  fieldValuesLoader,
  tableRouteLoader,
} from '../../api/loaders/table-route-loader';
import { CreateRecordDialog } from './create-record-dialog';
import { SmartTextFieldPicker } from './smart-text-field-picker';
import { UnifiedFileField } from './unified-file-field';

const RichTextEditor = lazy(() => {
  return import('./rich-text-editor').then((module) => ({
    default: module.RichTextEditor,
  }));
});

const JsonEditor = lazy(() => {
  return import('./json-editor').then((module) => ({
    default: module.JsonEditor,
  }));
});

// React Query functions for relation picker
async function loadRelationTopHits(relation: RelationConfig) {
  try {
    // We want to get top hits for the target column specifically
    const response = await fieldValuesLoader({
      schema: relation.target_schema,
      table: relation.target_table,
      field: relation.target_column,
      limit: 5,
      includeTopHits: true,
    });

    if (response.success && response.data?.topHits) {
      const topHitsWithLabels = await Promise.all(
        response.data.topHits.map(async (hit) => {
          try {
            // Get the full record to apply display format
            const recordData = await tableRouteLoader({
              schema: relation.target_schema,
              table: relation.target_table,
              page: 1,
              search: '',
              properties: JSON.stringify({
                [`${relation.target_column}.eq`]: hit.value,
              }),
            });

            if (recordData.data.length > 0) {
              const record = recordData.data[0];
              const displayFormat = recordData.table.displayFormat;

              const label =
                displayFormat && record
                  ? formatRecord(displayFormat, record)
                  : hit.value;

              return {
                label,
                value: hit.value,
                count: hit.count,
              };
            }

            return {
              label: hit.value,
              value: hit.value,
              count: hit.count,
            };
          } catch (error) {
            console.error('Error loading top hit record:', error);
            return {
              label: hit.value,
              value: hit.value,
              count: hit.count,
            };
          }
        }),
      );

      return topHitsWithLabels;
    }
    return [];
  } catch (error) {
    console.error('Failed to load top hits:', error);
    return [];
  }
}

async function loadRelationSearchResults(
  relation: RelationConfig,
  searchQuery: string,
) {
  const searchData = await tableRouteLoader({
    schema: relation.target_schema,
    table: relation.target_table,
    page: 1,
    search: searchQuery,
    properties: '{}',
  });

  const targetColumn = relation.target_column;
  return searchData.data.map((item) => {
    const displayFormat = searchData.table.displayFormat;

    if (!displayFormat) {
      return {
        label: item[targetColumn] as string | undefined,
        value: item[targetColumn] as string | undefined,
      };
    }

    return {
      label: formatRecord(displayFormat, item),
      value: item[targetColumn] as string | undefined,
    };
  });
}

// Custom hooks for relation queries
/**
 * Hook to fetch top hits for a relation field
 */
function useRelationTopHits(relation: RelationConfig, isEnabled: boolean) {
  return useQuery({
    queryKey: [
      'relation-top-hits',
      relation.target_schema,
      relation.target_table,
      relation.target_column,
    ],
    queryFn: () => loadRelationTopHits(relation),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(
      isEnabled &&
        relation.target_schema &&
        relation.target_table &&
        relation.target_column,
    ),
  });
}

/**
 * Hook to fetch search results for a relation field
 */
function useRelationSearchResults(
  relationConfig: RelationConfig,
  searchQuery: string,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: [
      'relation-search',
      relationConfig.target_schema,
      relationConfig.target_table,
      searchQuery,
    ],
    queryFn: () => loadRelationSearchResults(relationConfig, searchQuery),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: Boolean(
      isEnabled &&
        relationConfig.target_schema &&
        relationConfig.target_table &&
        searchQuery &&
        searchQuery.length >= 2,
    ),
  });
}

/**
 * Hook to fetch the display data for a selected relation option
 */
function useSelectedRelationOption(
  relationConfig: RelationConfig,
  value: string | undefined,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: [
      'relation-selected-option',
      relationConfig.target_schema,
      relationConfig.target_table,
      value,
    ],
    queryFn: async () => {
      if (!value) return null;

      const recordData = await tableRouteLoader({
        schema: relationConfig.target_schema,
        table: relationConfig.target_table,
        page: 1,
        search: '',
        properties: JSON.stringify({
          [`${relationConfig.target_column}.eq`]: value,
        }),
      });

      if (recordData.data.length > 0) {
        const record = recordData.data[0];
        const displayFormat = recordData.table.displayFormat;

        return {
          label:
            displayFormat && record
              ? formatRecord(displayFormat, record)
              : String(value),
          value: String(value),
        };
      }

      return { label: String(value), value: String(value) };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(
      isEnabled &&
        value &&
        relationConfig.target_schema &&
        relationConfig.target_table &&
        relationConfig.target_column,
    ),
  });
}

/**
 * Render the appropriate form control based on the field type
 * @param field - The field metadata
 * @param formField - The form field
 * @param relation - The relation object (if any)
 * @param relationConfig - The relation configuration
 * @param placeholder - The placeholder text
 * @param allowCreateRelation - Whether to allow creating relations
 * @returns The form control
 */
export function RecordFormControl({
  field,
  formField,
  relationConfig,
  relation,
  placeholder,
  allowCreateRelation,
  schema,
  table,
}: {
  field: ColumnMetadata;
  formField: ControllerRenderProps;
  relationConfig: RelationConfig | undefined;
  relation?: {
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  };
  placeholder: string | undefined;
  allowCreateRelation: boolean;
  schema?: string;
  table?: string;
}) {
  const uiType = field.ui_config?.ui_data_type?.toLowerCase() || '';
  const pgType = field.ui_config?.data_type?.toLowerCase() || '';

  if (relationConfig) {
    return (
      <RelationFieldPicker
        field={formField}
        column={field}
        relation={relation}
        relationConfig={relationConfig}
        placeholder={field.default_value ? placeholder : undefined}
        allowCreateRelation={allowCreateRelation}
      />
    );
  }

  // Render the appropriate input based on the field type
  if (uiType === 'email') {
    return <EmailField field={formField} placeholder={placeholder} />;
  } else if (uiType === 'url') {
    return <UrlField field={formField} placeholder={placeholder} />;
  } else if (uiType === 'longtext') {
    return <LongTextField field={formField} placeholder={placeholder} />;
  } else if (uiType === 'switch' || (uiType === '' && pgType === 'boolean')) {
    return (
      <div className="flex h-9 items-center">
        <SwitchField
          field={formField}
          labels={field.ui_config?.boolean_labels}
        />
      </div>
    );
  } else if (uiType === 'date' || (uiType === '' && pgType === 'date')) {
    return <DateField field={formField} placeholder={placeholder} />;
  } else if (
    ['datetime', 'time'].includes(uiType) ||
    ['timestamp', 'timestamp with time zone'].includes(pgType)
  ) {
    return <DateTimeField field={formField} />;
  } else if (uiType === 'markdown') {
    return <MarkdownField field={formField} placeholder={placeholder} />;
  } else if (uiType === 'html') {
    return <HtmlField field={formField} placeholder={placeholder} />;
  } else if (
    uiType === 'number' ||
    ['number', 'integer', 'float', 'decimal'].includes(pgType)
  ) {
    return <NumberField field={formField} />;
  } else if (['json', 'jsonb'].includes(pgType)) {
    return <JsonEditor field={formField} placeholder={placeholder} />;
  } else if (field.ui_config?.is_enum && field.ui_config?.enum_values) {
    return (
      <EnumField
        field={formField}
        options={field.ui_config.enum_values}
        placeholder={placeholder}
      />
    );
  } else if (
    uiType === 'file' ||
    uiType === 'image' ||
    uiType === 'audio' ||
    uiType === 'video'
  ) {
    return (
      <UnifiedFileField
        field={formField}
        column={field}
        placeholder={placeholder}
      />
    );
  } else if (uiType === 'phone') {
    return <PhoneField field={formField} placeholder={placeholder} />;
  } else if (uiType === 'color') {
    return <ColorField field={formField} />;
  } else if (uiType === 'address') {
    return <AddressField field={formField} />;
  } else {
    return (
      <TextField
        field={formField}
        placeholder={placeholder}
        column={field}
        schema={schema}
        table={table}
      />
    );
  }
}

function AddressField({ field }: { field: ControllerRenderProps }) {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
      }),
    ),
    defaultValues: {
      street: field.value?.street,
      city: field.value?.city,
      state: field.value?.state,
      zip: field.value?.zip,
      country: field.value?.country,
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            return field.onChange(
              {
                street: data.street,
                city: data.city,
                state: data.state,
                zip: data.zip,
                country: data.country,
              },
              {
                shouldValidate: true,
              },
            );
          })}
        >
          <div className="flex flex-col space-y-2">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dataExplorer:record.street" />
                  </FormLabel>

                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dataExplorer:record.city" />
                  </FormLabel>

                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dataExplorer:record.state" />
                  </FormLabel>

                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dataExplorer:record.zip" />
                  </FormLabel>

                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dataExplorer:record.country" />
                  </FormLabel>

                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit">Save</Button>
        </form>
      </Form>
    </div>
  );
}

// Form field type components
function EmailField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  return (
    <Input
      type="email"
      placeholder={placeholder}
      data-testid="field-input"
      data-field-type="email"
      {...field}
    />
  );
}

function UrlField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  return (
    <Input
      type="url"
      placeholder={placeholder}
      data-testid="field-input"
      data-field-type="url"
      {...field}
    />
  );
}

function SwitchField({
  field,
  labels,
}: {
  field: ControllerRenderProps;
  labels: { true_label?: string; false_label?: string } | undefined;
}) {
  const trueLabel = labels?.true_label || (
    <Trans i18nKey="dataExplorer:record.yes" />
  );

  const falseLabel = labels?.false_label || (
    <Trans i18nKey="dataExplorer:record.no" />
  );

  return (
    <div className="flex items-center gap-2">
      <Switch
        data-testid="field-switch"
        checked={field.value}
        onCheckedChange={(value) => {
          field.onChange(value, {
            shouldValidate: true,
          });
        }}
      />

      <span
        className="text-muted-foreground animate-in fade-in slide-in-from-left-2"
        key={field.value}
      >
        {field.value ? trueLabel : falseLabel}
      </span>
    </div>
  );
}

function DateField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  const dateFormatter = useDateFormatter();
  const getDate = useGetDate();
  const [{ timezone }] = useAccountPreferences();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'ring-ring flex w-full justify-start bg-transparent px-2.5 text-left font-normal focus:ring',
            !field.value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />

          <span className="text-muted-foreground">
            {field.value ? dateFormatter(new Date(field.value)) : placeholder}
          </span>

          <ChevronsUpDownIcon className="ml-2 h-3 w-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          timeZone={timezone}
          mode="single"
          selected={field.value ? getDate(new Date(field.value)) : undefined}
          onSelect={(date) => {
            const value = date ? date.toISOString() : '';

            field.onChange(value, {
              shouldValidate: true,
            });
          }}
          disabled={(date) => date < new Date('1900-01-01')}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateTimeField({ field }: { field: ControllerRenderProps }) {
  const dateFormatter = useDateFormatter();
  const getDate = useGetDate();
  const [{ timezone }] = useAccountPreferences();

  const [date, setDate] = useState<Date | undefined>(
    field.value ? getDate(field.value) : undefined,
  );

  // Format the date/time for display in the input
  const formattedTime = useMemo(() => {
    if (!date) {
      return '';
    }

    return getDate(date).toISOString().slice(11, 16);
  }, [date, getDate]);

  // Handle date selection from the calendar
  const handleDateSelect = useCallback(
    (selectedDate: Date | undefined) => {
      if (!selectedDate) {
        setDate(undefined);

        field.onChange('', {
          shouldValidate: true,
        });

        return;
      }

      // If we already have a date with time, preserve the time
      if (date) {
        selectedDate.setHours(date.getHours(), date.getMinutes());
      }

      setDate(selectedDate);

      field.onChange(selectedDate.toISOString(), {
        shouldValidate: true,
      });
    },
    [date, field],
  );

  // Handle manual input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (!inputValue) {
        setDate(undefined);

        field.onChange('', {
          shouldValidate: true,
        });

        return;
      }

      if (!date) {
        return;
      }

      date.setHours(
        Number(inputValue.split(':')[0]),
        Number(inputValue.split(':')[1]),
      );

      if (!Number.isNaN(date.getTime())) {
        setDate(date);

        field.onChange(date.toISOString(), {
          shouldValidate: true,
        });
      }
    },
    [date, field],
  );

  return (
    <div className="relative flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className={'ring-ring focus:ring'}
            >
              <If
                condition={date}
                fallback={
                  <>
                    <CalendarIcon className="mr-2 h-4 w-4" />

                    <Trans i18nKey="dataExplorer:record.pickDate" />

                    <ChevronsUpDownIcon className="ml-2 h-3 w-3" />
                  </>
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />

                <If condition={date} fallback={null}>
                  {(d) => {
                    return dateFormatter(d, 'LLL dd, yyyy');
                  }}
                </If>

                <ChevronsUpDownIcon className="ml-2 h-3 w-3" />
              </If>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              timeZone={timezone}
              mode="single"
              selected={date}
              onSelect={(date) => {
                return handleDateSelect(date ? getDate(date) : undefined);
              }}
              disabled={(date) => date < new Date('1900-01-01')}
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          defaultValue={formattedTime}
          onChange={handleInputChange}
          className="bg-background flex-1 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}

/**
 * Html field component
 * @param field - The field metadata
 * @param placeholder - The placeholder text
 * @param className - The class name for the html field
 * @returns The html field
 */
function HtmlField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
  className?: string;
}) {
  return (
    <RichTextEditor
      type="html"
      property={field.name}
      placeholder={placeholder}
      value={field.value || ''}
      onChange={(value) => {
        field.onChange(value, {
          shouldValidate: true,
        });
      }}
    />
  );
}

/**
 * Markdown field component
 * @param field - The field metadata
 * @param placeholder - The placeholder text
 * @returns The markdown field
 */
function MarkdownField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  return (
    <RichTextEditor
      type="markdown"
      property={field.name}
      placeholder={placeholder}
      value={field.value || ''}
      onChange={(value) => {
        field.onChange(value, {
          shouldValidate: true,
        });
      }}
    />
  );
}

/**
 * Number field component
 * @param field - The field metadata
 * @returns The number field
 */
function NumberField({ field }: { field: ControllerRenderProps }) {
  return (
    <Input
      type="number"
      placeholder="0"
      data-testid="field-input"
      data-field-type="number"
      {...field}
    />
  );
}

/**
 * Enum field component
 * @param field - The field metadata
 * @param options - The options for the enum
 * @param placeholder - The placeholder text
 * @returns The enum field
 */
function EnumField({
  field,
  options,
  placeholder,
}: {
  field: ControllerRenderProps;
  options: string[];
  placeholder: string | undefined;
}) {
  // We use a special value to represent an empty value
  const emptyValue = useId() + '___empty___';

  return (
    <Select
      value={field.value}
      onValueChange={(value) => {
        // If the value is the empty value, we set the value to null
        if (value === emptyValue) {
          field.onChange(null, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });

          return;
        }

        field.onChange(value, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }}
    >
      <SelectTrigger
        className={'ring-ring focus:ring'}
        data-testid="field-select"
      >
        <span>
          <SelectValue
            placeholder={
              <span className={'text-muted-foreground'}>{placeholder}</span>
            }
          />
        </span>
      </SelectTrigger>

      <SelectContent>
        <SelectItem key={'empty'} value={emptyValue}>
          <span className={'text-muted-foreground'}>
            <Trans i18nKey="dataExplorer:record.empty" />
          </span>
        </SelectItem>

        <SelectSeparator />

        {options.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Phone field component
 * @param field - The field metadata
 * @param placeholder - The placeholder text
 * @returns The phone field
 */
function PhoneField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  return <Input type="tel" placeholder={placeholder} {...field} />;
}

/**
 * Color field component
 * @param field - The field metadata
 * @returns The color field
 */
function ColorField({ field }: { field: ControllerRenderProps }) {
  return (
    <div className={'flex items-center space-x-2.5'}>
      <input
        className={
          'h-10 w-10 cursor-pointer rounded-lg border-0 hover:opacity-90'
        }
        type="color"
        data-testid="field-input"
        data-field-type="color"
        {...field}
      />

      <span className={'text-sm font-medium'}>{field.value}</span>
    </div>
  );
}

/**
 * Long text field component
 * @param field - The field metadata
 * @param placeholder - The placeholder text
 * @returns The long text field
 */
function LongTextField({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  return (
    <Textarea
      placeholder={placeholder}
      rows={4}
      className="min-h-[100px] resize-y"
      data-testid="field-textarea"
      {...field}
    />
  );
}

/**
 * Text field component
 * @param field - The field metadata
 * @param placeholder - The placeholder text
 * @param column - The column metadata
 * @param schema - The schema name
 * @param table - The table name
 * @returns The text field
 */
function TextField({
  field,
  placeholder,
  column,
  schema,
  table,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
  column?: ColumnMetadata;
  schema?: string;
  table?: string;
}) {
  // Use SmartTextFieldPicker if all required props are available
  if (schema && table && column) {
    if (column.ui_config.enable_smart_suggestions) {
      return (
        <SmartTextFieldPicker
          field={field}
          column={column}
          schema={schema}
          table={table}
          placeholder={placeholder}
        />
      );
    }
  }

  // Fallback to regular input
  return (
    <Input
      placeholder={placeholder}
      data-testid="field-input"
      data-field-type="text"
      data-field-name={field.name}
      {...field}
    />
  );
}

interface RelationPickerState {
  loading: boolean;
  open: boolean;
  hasResults: boolean | undefined;
  options: Array<{ label: string | undefined; value: string | undefined }>;
  topHits: Array<{
    label: string | undefined;
    value: string | undefined;
    count: number;
  }>;
  searchQuery: string;
  debouncedSearchQuery: string;
}

type RelationPickerAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_HAS_RESULTS'; payload: boolean | undefined }
  | {
      type: 'SET_OPTIONS';
      payload: Array<{ label: string | undefined; value: string | undefined }>;
    }
  | {
      type: 'SET_TOP_HITS';
      payload: Array<{
        label: string | undefined;
        value: string | undefined;
        count: number;
      }>;
    }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH_QUERY'; payload: string }
  | { type: 'RESET' };

function relationPickerReducer(
  state: RelationPickerState,
  action: RelationPickerAction,
): RelationPickerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_OPEN':
      return { ...state, open: action.payload };
    case 'SET_HAS_RESULTS':
      return { ...state, hasResults: action.payload };
    case 'SET_OPTIONS':
      return { ...state, options: action.payload };
    case 'SET_TOP_HITS':
      return { ...state, topHits: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_DEBOUNCED_SEARCH_QUERY':
      return { ...state, debouncedSearchQuery: action.payload };
    case 'RESET':
      return {
        loading: false,
        open: false,
        hasResults: undefined,
        options: [],
        topHits: [],
        searchQuery: '',
        debouncedSearchQuery: '',
      };
    default:
      return state;
  }
}

/**
 * Popover content component for relation field picker
 */
function RelationPickerPopoverContent({
  relationConfig,
  field,
  allowCreateRelation,
  isOpen,
  searchSubject$,
  onClose,
}: {
  relationConfig: RelationConfig;
  field: ControllerRenderProps;
  allowCreateRelation: boolean;
  isOpen: boolean;
  searchSubject$: Subject<string>;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const [state, dispatch] = useReducer(relationPickerReducer, {
    loading: false,
    open: false,
    hasResults: undefined,
    options: [],
    topHits: [],
    searchQuery: '',
    debouncedSearchQuery: '',
  });

  // Set up RxJS debouncing for search
  useEffect(() => {
    const subscription = searchSubject$
      .pipe(
        debounceTime(500),
        map((query) => query.trim()),
        filter((query) => query.length > 2),
      )
      .subscribe((debouncedQuery) => {
        dispatch({
          type: 'SET_DEBOUNCED_SEARCH_QUERY',
          payload: debouncedQuery,
        });
      });

    return () => subscription.unsubscribe();
  }, [searchSubject$]);

  // Load top hits using React Query - only when popover is open
  const { data: topHitsData, isLoading: isTopHitsLoading } = useRelationTopHits(
    relationConfig,
    isOpen,
  );

  // Load search results using React Query
  const { data: searchResultsData, isLoading: isSearchPending } =
    useRelationSearchResults(
      relationConfig,
      state.debouncedSearchQuery,
      isOpen,
    );

  const topHits = topHitsData || [];
  const options = searchResultsData || [];

  return (
    <PopoverContent align="start" className="min-w-[400px]">
      <Command shouldFilter={false}>
        <div className="flex items-center border-b px-3">
          <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />

          <input
            autoFocus
            placeholder={t('dataExplorer:filters.search')}
            data-testid="relation-search-input"
            className="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onFocus={(e) => {
              e.preventDefault();
            }}
            onInput={(e) => {
              const input = e.target as HTMLInputElement;
              const value = input.value.trim();

              dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
              searchSubject$.next(value);
            }}
          />
        </div>

        {isSearchPending ? (
          <div className="text-muted-foreground animate-pulse p-2 text-xs">
            {t('dataExplorer:filters.loading')}
          </div>
        ) : state.debouncedSearchQuery && options.length === 0 ? (
          <CommandEmpty className="text-muted-foreground p-2 text-xs">
            {t('dataExplorer:filters.noResultsFound')}
          </CommandEmpty>
        ) : !state.debouncedSearchQuery ? (
          <>
            <If condition={isTopHitsLoading}>
              <div className="text-muted-foreground animate-pulse p-2 text-xs">
                {t('dataExplorer:filters.loadingTopHits')}
              </div>
            </If>

            {topHits.length > 0 && (
              <CommandGroup
                heading={t('dataExplorer:record.topValues', 'Top Values')}
              >
                {topHits.map((hit) => (
                  <CommandItem
                    tabIndex={0}
                    className="rounded-0 flex cursor-pointer flex-col items-start border-b last:border-b-0"
                    key={hit.value}
                    value={hit.value}
                    data-testid="relation-top-hit"
                    data-option-value={hit.value}
                    onSelect={() => {
                      field.onChange(hit.value, {
                        shouldValidate: true,
                      });
                      onClose();
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex flex-col">
                        <span>{hit.label || hit.value}</span>
                      </div>

                      <span className="text-muted-foreground text-xs">
                        {hit.count}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {topHits.length === 0 && (
              <CommandEmpty className="text-muted-foreground p-2 text-xs">
                {t('dataExplorer:filters.enterSearchQuery')}
              </CommandEmpty>
            )}
          </>
        ) : (
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                tabIndex={0}
                className="flex cursor-pointer flex-col items-start rounded"
                key={option.value}
                value={option.value}
                data-testid="relation-option"
                data-option-value={option.value}
                onSelect={() => {
                  field.onChange(option.value, {
                    shouldValidate: true,
                  });

                  onClose();
                }}
              >
                <span>{option.label || option.value}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </Command>

      <If condition={allowCreateRelation}>
        <CreateRecordDialog
          schema={relationConfig.target_schema}
          table={relationConfig.target_table}
          onCreate={(data) => {
            // after creating the record, set the value of the field to the value of the target column
            return field.onChange(data[relationConfig.target_column], {
              shouldValidate: true,
            });
          }}
        >
          <div className="mt-4 flex">
            <Button variant="outline" size="sm" className="w-full">
              <PlusIcon className="mr-1 h-3 w-3" />
              <Trans i18nKey="dataExplorer:record.createRecord" />
            </Button>
          </div>
        </CreateRecordDialog>
      </If>
    </PopoverContent>
  );
}

/**
 * Relation field picker component
 * @param field - The field metadata
 * @param column - The column metadata
 * @param relationConfig - The relation configuration
 * @param placeholder - The placeholder text
 * @param allowCreateRelation - Whether to allow creating relations
 * @param foreignRecord
 * @returns The relation editor
 */
function RelationFieldPicker({
  field,
  column,
  relationConfig,
  relation,
  allowCreateRelation,
}: {
  field: ControllerRenderProps;
  column: ColumnMetadata;
  relationConfig: RelationConfig;
  relation?: {
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  };
  placeholder: string | undefined;
  allowCreateRelation: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = field.value;

  const displayValuePlaceholder = relation?.formatted || value;
  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  // For display purposes, we need to get the selected option's label
  // This query only runs when we have a value and popover is closed
  const { data: selectedOptionData } = useSelectedRelationOption(
    relationConfig,
    value,
    !isOpen && !relation?.formatted,
  );

  const displayValue = selectedOptionData?.label ?? displayValuePlaceholder;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) {
      searchSubject$.next('');
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={'flex w-full items-center space-x-2'}>
        <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              disabled={field.disabled}
              variant="outline"
              data-testid="field-relation-picker"
              className={cn(
                'ring-ring group/button relative flex w-full items-center justify-between gap-2 bg-transparent px-2.5 text-left focus:ring',
              )}
            >
              <span className="flex items-center gap-2">
                <SearchIcon className="h-3 w-3" />

                <span>
                  {displayValue || (
                    <span className={'text-muted-foreground'}>
                      <Trans
                        i18nKey="dataExplorer:record.pickRecord"
                        values={{
                          name: column.display_name || column.name,
                        }}
                      />
                    </span>
                  )}
                </span>

                <ChevronsUpDownIcon className="h-3 w-3" />
              </span>

              <If condition={field.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="icon"
                      className="bg-secondary group-hover:bg-background hover:bg-background absolute right-2 z-10 flex h-6 w-6 items-center gap-x-2 rounded-full"
                      variant="ghost"
                      onClick={() => {
                        field.onChange(null, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <span>
                        <XIcon role="button" className="h-3 w-3" />
                      </span>
                    </Button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <Trans i18nKey="dataExplorer:record.clear" />
                  </TooltipContent>
                </Tooltip>
              </If>
            </Button>
          </PopoverTrigger>

          <If condition={isOpen}>
            <RelationPickerPopoverContent
              relationConfig={relationConfig}
              field={field}
              allowCreateRelation={allowCreateRelation}
              isOpen={isOpen}
              searchSubject$={searchSubject$}
              onClose={() => setIsOpen(false)}
            />
          </If>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
