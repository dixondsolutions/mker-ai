import React, { Suspense, lazy, useEffect, useState } from 'react';

import { Link, useFetcher } from 'react-router';

import { formatDistance } from 'date-fns';
import {
  CheckCircle,
  Code,
  Copy,
  Edit,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  Type,
  XCircle,
} from 'lucide-react';

import { useDateFormatter, useNumberFormatter } from '@kit/formatters/hooks';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { ColumnMetadata, RelationConfig } from '@kit/types';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { ButtonGroup } from '@kit/ui/button-group';
import { CopyToClipboard } from '@kit/ui/copy-to-clipboard';
import { If } from '@kit/ui/if';
import { Spinner } from '@kit/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';

import { FieldTypeIcon } from './field-type-icon';
import { MarkdownRenderer } from './mardown-renderer';

const CodeBlock = lazy(() =>
  import('@kit/ui/shiki').then((mod) => ({
    default: mod.CodeBlock,
  })),
);

const FormFieldInlineEditor = lazy(() =>
  import('./form-field-inline-editor').then((mod) => ({
    default: mod.FormFieldInlineEditor,
  })),
);

interface Relation {
  column: string;
  original: unknown;
  formatted: string | null | undefined;
  link: string | null | undefined;
}

interface RecordFieldProps {
  column: ColumnMetadata;
  value: unknown;
  canEdit: boolean;
  action: string;
  formattedValue?: string | null;
  relation?: Relation;
  relationConfig?: RelationConfig;
}

/**
 * Renders a record field
 * @param column - The column to render
 * @param value - The value to render
 * @param relationInfo - The relation info for the column
 * @param formattedValue - The formatted value of the relation
 * @param canEdit - Whether the field is editable
 */
export function RecordField({
  column,
  value,
  relation,
  relationConfig,
  canEdit,
  action,
}: RecordFieldProps) {
  const [isEditing, setIsEditing] = useState(false);

  const dateFormatter = useDateFormatter();

  // the UI data type is custom-defined by the user, so we use that first
  const uiType = column.ui_config?.ui_data_type?.toLowerCase() || '';

  // the postgres data type is the type of the column in the database
  const pgType = column.ui_config?.data_type?.toLowerCase() || '';

  const { formatNumber, formatCurrency, formatPercentage } =
    useNumberFormatter();

  const fetcher = useFetcher<{
    success: boolean;
    error: string;
    data: Record<string, unknown>;
  }>();

  // Get the content based on the field type
  const content = renderFieldContent({
    column,
    value,
    relation,
    relationConfig,
    dateFormatter,
    formatNumber,
    formatCurrency,
    formatPercentage,
  });

  /**
   * The field is editable if the user has permission to edit the field
   * and the field is editable in the UI
   */
  const isEditable = canEdit && column.is_editable;

  // close the editor when the fetcher is successful
  useEffect(() => {
    if (fetcher.data?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false);
    }
  }, [fetcher.data?.success]);

  return (
    <div className="group/column text-muted-foreground space-y-4 border-b border-dashed py-6 transition-colors last:border-b-0">
      <div>
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <FieldTypeIcon type={uiType || pgType} />

            <span className="text-foreground text-sm font-semibold">
              {column.display_name || column.name}
            </span>

            <If condition={isEditable}>
              <div className="hidden items-center space-x-2 group-hover/column:flex">
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          setIsEditing(true);
                        }}
                        variant={'ghost'}
                        size={'icon'}
                        className="hover:bg-muted h-5 w-5 cursor-pointer rounded-md p-1"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <Trans i18nKey="dataExplorer:record.inlineEdit" />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </If>
          </div>

          <If condition={column.description}>
            <span className="text-muted-foreground text-xs">
              {column.description}
            </span>
          </If>
        </div>
      </div>

      <If condition={isEditing && isEditable} fallback={content}>
        <Suspense
          fallback={
            <div className="flex items-center gap-x-2">
              <Spinner className="h-5 w-5" />

              <span className="text-muted-foreground text-xs">
                <Trans i18nKey={'common:loading'} />
              </span>
            </div>
          }
        >
          <FormFieldInlineEditor
            column={column}
            value={value}
            displayButtonLabels={true}
            className="flex-col items-start gap-y-2"
            relation={relation}
            relationConfig={relationConfig || undefined}
            onCancel={() => setIsEditing(false)}
            isSubmitting={fetcher.state === 'submitting'}
            onSubmit={(data) => {
              fetcher.submit(JSON.stringify(data), {
                method: 'PUT',
                action,
                encType: 'application/json',
              });
            }}
          />
        </Suspense>
      </If>
    </div>
  );
}

/**
 * Renders field content based on its type and configuration
 */
function renderFieldContent({
  column,
  value,
  relation,
  relationConfig,
  dateFormatter,
  formatNumber,
  formatCurrency,
  formatPercentage,
}: {
  column: ColumnMetadata;
  value: unknown;
  relation?: {
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  };
  relationConfig?: RelationConfig;
  dateFormatter: (date: Date, format?: string) => string;
  formatNumber: (
    value: unknown,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string;
  formatCurrency: (
    value: unknown,
    currency?: string,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string;
  formatPercentage: (
    value: unknown,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string;
}): React.ReactNode {
  // the UI data type is custom-defined by the user, so we use that first
  const uiType = column.ui_config?.ui_data_type?.toLowerCase() || '';

  // the postgres data type is the type of the column in the database
  const pgType = column.ui_config?.data_type?.toLowerCase() || '';

  // Handle null/undefined values
  if (value === null || value === undefined) {
    return renderEmpty();
  }

  // Handle relations
  if (relation && relationConfig) {
    return renderRelation({
      value,
      formattedValue: relation.formatted,
      relationConfig,
    });
  }

  // Handle specific UI types
  if (uiType === 'email' && typeof value === 'string') {
    return renderEmail(value);
  }

  if (uiType === 'url' && typeof value === 'string') {
    return renderUrl(value);
  }

  if (uiType === 'switch' || (uiType === '' && pgType === 'boolean')) {
    return renderBoolean(value, column.ui_config?.boolean_labels);
  }

  if (uiType === 'date' && typeof value === 'string') {
    return renderDate(value, dateFormatter);
  }

  if (uiType === 'time' && typeof value === 'string') {
    return renderTime(value, dateFormatter);
  }

  if (uiType === 'currency') {
    return renderCurrency(
      value as string,
      column.ui_config?.ui_data_type_config as {
        currency: string | undefined;
      },
      formatCurrency,
    );
  }

  if (uiType === 'percentage') {
    return renderPercentage(value as string, formatPercentage);
  }

  if (
    (uiType === 'datetime' ||
      (uiType === '' &&
        ['date', 'timestamp', 'timestamp with time zone'].includes(pgType))) &&
    typeof value === 'string'
  ) {
    return renderDateTime(value, dateFormatter);
  }

  if (
    uiType === 'code' ||
    (uiType === '' && ['json', 'jsonb'].includes(pgType))
  ) {
    return renderCode(value);
  }

  if (
    uiType === 'number' ||
    (uiType === '' &&
      ['number', 'integer', 'float', 'decimal'].includes(pgType) &&
      (typeof value === 'number' || !Number.isNaN(Number(value))))
  ) {
    return renderNumber(value, formatNumber);
  }

  if (uiType === 'markdown' && typeof value === 'string') {
    return renderMarkdown(value);
  }

  if (uiType === 'html' && typeof value === 'string') {
    return renderHtml(value);
  }

  if (uiType === 'image' && typeof value === 'string') {
    return <ImageField value={value} />;
  }

  if (uiType === 'audio' && typeof value === 'string') {
    return <AudioField value={value} />;
  }

  if (uiType === 'video' && typeof value === 'string') {
    return <VideoField value={value} />;
  }

  if (uiType === 'file' && typeof value === 'string') {
    return renderFile(value, column.display_name || column.name);
  }

  if (uiType === 'phone' && typeof value === 'string') {
    return renderPhone(value);
  }

  if (uiType === 'color' && typeof value === 'string') {
    return renderColor(value);
  }

  if (uiType === 'address' && typeof value === 'string') {
    return renderAddress(value);
  }

  if (pgType === 'uuid') {
    return renderUuid(value as string);
  }

  if (pgType.toLowerCase() === 'user-defined') {
    return renderEnum(value as string, column.ui_config.enum_badges);
  }

  // Default to text rendering
  return renderText(value);
}

/**
 * Renders an empty value as a span with a tooltip for copying
 * @returns A span with a tooltip for copying
 */
function renderEmpty() {
  return (
    <span className="text-muted-foreground text-sm italic">
      <Trans i18nKey="dataExplorer:record.empty" />
    </span>
  );
}

/**
 * Renders an email value as a div with a mail icon and a copyable span
 * @param value - The email value to render
 * @returns A div with a mail icon and a copyable span
 */
function renderEmail(value: string) {
  return (
    <div className="flex items-center space-x-2">
      <Mail className="text-muted-foreground h-3.5 w-3.5" />

      <CopyToClipboard value={value}>
        <span className="text-sm">{value}</span>
      </CopyToClipboard>
    </div>
  );
}

/**
 * Renders a URL value as a div with a link icon and a link
 * @param value - The URL value to render
 * @returns A div with a link icon and a link
 */
function renderUrl(value: string) {
  return (
    <div className="flex items-center space-x-2">
      <LinkIcon className="text-muted-foreground h-3.5 w-3.5" />

      <span className="text-sm">{value}</span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" asChild>
              <Link
                to={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p className="text-xs">
              <Trans i18nKey="dataExplorer:record.openInNewTab" />
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * Renders a boolean value as a badge with a checkmark or cross icon
 * @param value - The boolean value to render
 * @param customLabels - Custom labels for true/false values
 * @returns A badge with a checkmark or cross icon
 */
function renderBoolean(
  value: unknown,
  customLabels?: { true_label?: string; false_label?: string },
) {
  const boolValue = Boolean(value);

  // Use custom labels if provided, otherwise fall back to translations
  const trueLabel = customLabels?.true_label || (
    <Trans i18nKey="dataExplorer:record.yes" />
  );
  const falseLabel = customLabels?.false_label || (
    <Trans i18nKey="dataExplorer:record.no" />
  );

  return (
    <Badge
      className="inline-flex gap-x-1 font-normal"
      variant={boolValue ? 'success' : 'destructive'}
    >
      {boolValue ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}

      {boolValue ? trueLabel : falseLabel}
    </Badge>
  );
}

/**
 * Renders a date value as a formatted string
 * @param value - The date value to render
 * @param dateFormatter - The date formatter function
 * @returns A formatted string
 */
function renderDate(value: string, dateFormatter: (date: Date) => string) {
  const date = new Date(value);
  const displayValue = dateFormatter(date);

  return Number.isNaN(date.getTime()) ? (
    <span className="text-sm">{String(date)}</span>
  ) : (
    <span className="text-sm tabular-nums">{displayValue}</span>
  );
}

/**
 * Renders a time value as a formatted string
 * @param value - The time value to render
 * @param dateFormatter - The date formatter function
 * @returns A formatted string
 */
function renderTime(
  value: string,
  dateFormatter: (date: Date, format: string) => string,
) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? (
    <span className="text-sm">{String(value)}</span>
  ) : (
    <span className="text-sm tabular-nums">
      {dateFormatter(date, 'LLL, d, yyyy HH:mm:ss')}
    </span>
  );
}

/**
 * Renders a date and time value as a formatted string
 * @param value - The date and time value to render
 * @param dateFormatter - The date formatter function
 * @returns A formatted string
 */
function renderDateTime(value: string, dateFormatter: (date: Date) => string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span className="text-sm">{String(value)}</span>;
  }

  // Format relative time
  const now = new Date();

  const displayValue = dateFormatter(date);
  const relativeTime = formatDistance(date, now);

  return (
    <div className="flex flex-col">
      <span className="text-sm tabular-nums">{displayValue}</span>

      <span className="text-muted-foreground text-xs">{relativeTime}</span>
    </div>
  );
}

/**
 * Renders a code value as a formatted string
 * @param value - The code value to render
 * @returns A formatted string
 */
function renderCode(value: unknown) {
  const jsonValue =
    typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : typeof value === 'string'
        ? value
        : String(value);

  return (
    <div className="group relative">
      <CodeBlock lang="json">{jsonValue}</CodeBlock>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => navigator.clipboard.writeText(jsonValue)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * Renders a number value as a formatted string
 * @param value - The number value to render
 * @param formatNumber - The number formatter function
 * @returns A formatted string
 */
function renderNumber(
  value: unknown,
  formatNumber: (
    value: unknown,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string,
) {
  if (value == null) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const formatted = formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return <span className="text-sm font-medium tabular-nums">{formatted}</span>;
}

function renderMarkdown(value: string) {
  return <MarkdownHtmlViewer value={value} type="markdown" />;
}

/**
 * Renders a HTML value as a formatted string
 * @param value - The HTML value to render
 * @returns A formatted string
 */
function renderHtml(value: string) {
  return <MarkdownHtmlViewer value={value} type="html" />;
}

/**
 * Viewer component with toggle between rendered and code view
 */
function MarkdownHtmlViewer({
  value,
  type,
}: {
  value: string;
  type: 'html' | 'markdown';
}) {
  const storageKey = `viewer-mode-${type}`;

  const [mode, setMode] = useState<'rendered' | 'code'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      return (stored as 'rendered' | 'code') || 'rendered';
    }

    return 'rendered';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [mode, storageKey]);

  return (
    <div className="relative">
      <div className="mb-2 flex justify-end">
        <ButtonGroup>
          <Button
            type="button"
            variant={mode === 'rendered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('rendered')}
            className="h-7 gap-1 px-2"
          >
            <Type className="h-3 w-3" />

            <span className="text-xs">
              <Trans
                i18nKey="dataExplorer:viewer.rendered"
                defaults="Rendered"
              />
            </span>
          </Button>

          <Button
            type="button"
            variant={mode === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('code')}
            className="h-7 gap-1 px-2"
          >
            <Code className="h-3 w-3" />
            <span className="text-xs">
              <Trans i18nKey="dataExplorer:viewer.code" defaults="Code" />
            </span>
          </Button>
        </ButtonGroup>
      </div>

      {mode === 'rendered' ? (
        type === 'markdown' ? (
          <Suspense fallback={<Spinner />}>
            <MarkdownRenderer value={value} />
          </Suspense>
        ) : (
          <div className="markdown max-w-none">
            <div dangerouslySetInnerHTML={{ __html: value }} />
          </div>
        )
      ) : (
        <Suspense fallback={<Spinner />}>
          <CodeBlock lang={type}>{value}</CodeBlock>
        </Suspense>
      )}
    </div>
  );
}

/**
 * Renders an image value as an image tag
 * @param value - The image value to render
 * @returns An image tag
 */
function ImageField({ value }: { value: string }) {
  const client = useSupabase();

  // Check if it's a valid URL or relative path that could be an image
  let path = value;

  try {
    const url = new URL(value);

    // If it's a valid URL, we can use it directly
    path = url.href;
  } catch {
    // Check if it looks like a Supabase storage path (bucket/path format without protocol)
    // Only treat as storage path if it doesn't contain a protocol and has proper bucket/path structure
    if (!value.includes('://') && value.includes('/')) {
      const [bucket, ...rest] = value.split('/');
      const parts = rest.join('/');

      if (bucket && parts) {
        path = client.storage.from(bucket).getPublicUrl(parts).data.publicUrl;
      } else {
        return <span className="text-sm text-red-500">Invalid image path</span>;
      }
    } else {
      // If it contains a protocol but still failed URL parsing, it's malformed
      return <span className="text-sm text-red-500">Invalid image URL</span>;
    }
  }

  return (
    <img
      loading="lazy"
      decoding="async"
      src={path}
      className="max-h-64 border"
    />
  );
}

/**
 * Renders an audio value with controls
 * @param value - The audio value to render
 * @returns An audio element
 */
function AudioField({ value }: { value: string }) {
  const client = useSupabase();

  let path = value;

  try {
    const url = new URL(value);
    path = url.href;
  } catch {
    // Check if it looks like a Supabase storage path (bucket/path format without protocol)
    // Only treat as storage path if it doesn't contain a protocol and has proper bucket/path structure
    if (!value.includes('://') && value.includes('/')) {
      const [bucket, ...rest] = value.split('/');
      const parts = rest.join('/');

      if (bucket && parts) {
        path = client.storage.from(bucket).getPublicUrl(parts).data.publicUrl;
      } else {
        return <span className="text-sm text-red-500">Invalid audio path</span>;
      }
    } else {
      // If it contains a protocol but still failed URL parsing, it's malformed
      return <span className="text-sm text-red-500">Invalid audio URL</span>;
    }
  }

  return <audio controls src={path} className="max-h-64" />;
}

/**
 * Renders a video value with controls
 * @param value - The video value to render
 * @returns A video element
 */
function VideoField({ value }: { value: string }) {
  const client = useSupabase();

  let path = value;

  try {
    const url = new URL(value);
    path = url.href;
  } catch {
    // Check if it looks like a Supabase storage path (bucket/path format without protocol)
    // Only treat as storage path if it doesn't contain a protocol and has proper bucket/path structure
    if (!value.includes('://') && value.includes('/')) {
      const [bucket, ...rest] = value.split('/');
      const parts = rest.join('/');

      if (bucket && parts) {
        path = client.storage.from(bucket).getPublicUrl(parts).data.publicUrl;
      } else {
        return <span className="text-sm text-red-500">Invalid video path</span>;
      }
    } else {
      // If it contains a protocol but still failed URL parsing, it's malformed
      return <span className="text-sm text-red-500">Invalid video URL</span>;
    }
  }

  return <video controls src={path} className="max-h-64 border" />;
}

/**
 * Renders a file value as a link to the file
 * @param value - The file value to render
 * @param fileName - The file name for display
 * @returns A link to the file
 */
function renderFile(value: string, fileName: string) {
  const fileNameFromUrl = getFileNameFromUrl(value);
  const displayName = fileName || fileNameFromUrl;

  return (
    <div className="flex items-center space-x-2">
      <LinkIcon className="text-muted-foreground h-3.5 w-3.5" />

      <span className="text-sm">{displayName}</span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" asChild>
              <Link
                to={value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p className="text-xs">
              <Trans i18nKey="dataExplorer:record.openInNewTab" />
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * Renders a phone value as a copyable span
 * @param value - The phone value to render
 * @returns A copyable span
 */
function renderPhone(value: string) {
  return (
    <CopyToClipboard value={value}>
      <span className="text-sm">{value}</span>
    </CopyToClipboard>
  );
}

/**
 * Renders a color value as a swatch and hex code
 * @param value - The color value to render
 * @returns A span with color swatch and code
 */
function renderColor(value: string) {
  return (
    <span className="flex items-center gap-x-1 text-sm">
      <span
        className="h-4 w-4 rounded border"
        style={{ backgroundColor: value }}
      />
      {value}
    </span>
  );
}

/**
 * Renders an address value as a div with a link to the address on Google Maps
 * @param value - The address value to render
 * @returns A div with a link to the address on Google Maps
 */
function renderAddress(value: string) {
  const encodedAddress = encodeURIComponent(value);

  return (
    <div>
      <div className="mb-1 whitespace-pre-wrap">{value}</div>

      <a
        href={`https://maps.google.com/?q=${encodedAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-xs underline"
      >
        <Trans i18nKey="dataExplorer:record.viewOnMap" />
      </a>
    </div>
  );
}

/**
 * Renders a text value as a span with whitespace-pre-wrap
 * @param value - The text value to render
 * @returns A span with whitespace-pre-wrap
 */
function renderText(value: unknown) {
  if (!value) {
    return renderEmpty();
  }

  return <span className="text-sm whitespace-pre-wrap">{String(value)}</span>;
}

/**
 * Renders a UUID value as a truncated span with a tooltip for copying
 * @param value - The UUID value to render
 * @returns A span with a tooltip for copying
 */
function renderUuid(value: string) {
  // Create a truncated version that shows beginning and end
  const truncated = `${value.slice(0, 8)}...${value.slice(-8)}`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <CopyToClipboard value={value}>
            <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              {truncated}
            </span>
          </CopyToClipboard>
        </TooltipTrigger>

        <TooltipContent>
          <p className="text-xs">
            <Trans i18nKey="dataExplorer:record.copyFullUuid" />
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Renders a relation value as a link to the related record
 * @param value - The relation value to render
 * @param formattedValue - The formatted value of the relation
 * @param relationInfo - The relation info for the column
 * @returns A link to the related record
 */
function renderRelation({
  value,
  formattedValue,
  relationConfig,
}: {
  value: unknown;
  formattedValue: string | null | undefined;
  relationConfig: RelationConfig;
}) {
  let displayValue = value;

  if (formattedValue) {
    displayValue = formattedValue;
  }

  return (
    <Button variant="secondary" size="sm" className="hover:underline" asChild>
      <Link
        className="flex items-center space-x-2 text-sm"
        to={`/resources/${relationConfig.target_schema}/${relationConfig.target_table}/record/${value}`}
      >
        <span>{displayValue as string}</span>

        <ExternalLink className="h-3 w-3" />
      </Link>
    </Button>
  );
}

/**
 * Renders an enum value as a badge
 * @param value - The enum value to render
 * @param badges
 * @returns A badge
 */
function renderEnum(
  value: string,
  badges?: Record<string, { variant?: string }>,
) {
  const badge = badges?.[value];

  return (
    <Badge
      variant={
        (badge?.variant as React.ComponentProps<typeof Badge>['variant']) ||
        'secondary'
      }
      className="inline-flex gap-x-1 font-normal"
    >
      {String(value)}
    </Badge>
  );
}

/**
 * Renders a currency value as a formatted string
 * @param value - The currency value to render
 * @param config - The configuration for the currency
 * @param formatCurrency - The currency formatter function
 * @returns A formatted string
 */
function renderCurrency(
  value: string,
  config: { currency: string | undefined },
  formatCurrency: (
    value: unknown,
    currency?: string,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string,
) {
  if (value == null) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const currency = config.currency;

  const formatted = currency
    ? formatCurrency(value, currency, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : formatCurrency(value, undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return <span className="text-sm">{formatted}</span>;
}

/**
 * Renders a percentage value as a formatted string
 * @param value - The percentage value to render
 * @param formatPercentage - The percentage formatter function
 * @returns A formatted string
 */
function renderPercentage(
  value: string,
  formatPercentage: (
    value: unknown,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
    },
  ) => string,
) {
  if (value == null) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const formatted = formatPercentage(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return <span className="text-sm">{formatted}</span>;
}

/**
 * Extract filename from URL
 */
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    return pathname.split('/').pop() || 'file';
  } catch {
    return 'file';
  }
}
