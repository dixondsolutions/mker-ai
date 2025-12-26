import { useCallback, useMemo, useState } from "react";

import { FetcherWithComponents, Link } from "react-router";

import {
  CalendarIcon,
  CheckCircle,
  CodeIcon,
  EditIcon,
  ExternalLinkIcon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
  XCircle,
} from "lucide-react";

import {
  useDateFormatter,
  useDataFormatter,
  useNumberFormatter,
} from "@kit/formatters/hooks";
import { toHumanReadable } from "@kit/formatters";
import { ColumnMetadata, RelationConfig } from "@kit/types";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { CopyToClipboard } from "@kit/ui/copy-to-clipboard";
import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";
import { Trans } from "@kit/ui/trans";
import { cn } from "@kit/ui/utils";

type Relation = {
  column: string;
  original: unknown;
  formatted: string | null | undefined;
  link: string | null | undefined;
};

/**
 * Data explorer cell renderer
 * @param props - The props
 * @returns The data explorer cell renderer
 */
export function DataExplorerCellRenderer(props: {
  column: ColumnMetadata;
  value: unknown;
  relationConfig?: RelationConfig;
  relation?: Relation;
  action?: string;
  InlineEditor?: React.ComponentType<{
    column: ColumnMetadata;
    value: unknown;
    relation?: Relation;
    relationConfig?: RelationConfig;
    onCancel: () => void;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
    displayButtonLabels?: boolean;
    className?: string;
  }>;
  fetcher?: FetcherWithComponents<{
    success: boolean;
    error: string;
    data: Record<string, unknown>;
  }>;
}) {
  const {
    value,
    column,
    relation,
    relationConfig,
    fetcher,
    action,
    InlineEditor,
  } = props;

  const uiConfig = column?.ui_config;
  const dataType = column?.ui_config.data_type;
  const uiDataType = uiConfig?.ui_data_type;
  const enumBadges = uiConfig?.enum_badges;
  const isEditable = column?.is_editable ?? true;

  const [isEditing, setIsEditing] = useState(false);

  const handleEditSubmit = useCallback(
    (data: Record<string, unknown>) => {
      if (!action || !fetcher) {
        return;
      }

      fetcher.submit(JSON.stringify(data), {
        method: "PUT",
        action,
        encType: "application/json",
      });
    },
    [fetcher, action],
  );

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const getCellContent = useCallback(() => {
    // if the formatted value is set, we use the relation cell renderer
    if (relation?.formatted) {
      if (relation?.link) {
        return (
          <RelationCell label={relation?.formatted} link={relation?.link} />
        );
      }

      return relation?.formatted;
    }

    // we first check if the uiDataType is set, because it allows us to
    // display a more specific cell renderer for the value (ex. email, phone, url, etc.)
    if (uiDataType) {
      switch (uiDataType) {
        case "email":
          return <EmailCell data={value as string} />;

        case "phone":
          return <PhoneCell data={value as string} />;

        case "url":
          return <URLCell data={value as string} />;

        case "color":
          return <ColorCell data={value as string} />;

        case "currency":
          return (
            <CurrencyCell
              data={value as string}
              currency={uiConfig?.currency}
            />
          );

        case "percentage":
          return <PercentageCell data={value as string} />;

        default:
          break;
      }
    }

    // if the uiDataType is not set, we use the dataType to determine the cell renderer
    if (!dataType) {
      return <TextCell data={value as string | object | null | undefined} />;
    }

    switch (dataType.toLowerCase()) {
      case "json":
      case "jsonb":
        return <JSONCell />;

      case "text":
        return <TextCell data={value as string | object | null | undefined} />;

      case "integer":
      case "bigint":
      case "smallint":
      case "real":
      case "double precision":
      case "numeric":
        return <NumberCell data={value as string} />;

      case "uuid":
        return <UUIDCell data={value as string} />;

      case "date":
      case "timestamp":
      case "timestamp with time zone":
        return <DateCell data={value as string} />;

      case "boolean":
        return (
          <BooleanCell
            data={value as boolean}
            customLabels={uiConfig?.["boolean_labels"]}
          />
        );

      case "user-defined":
        return (
          <EnumCell
            data={toHumanReadable(value as string)}
            badge={enumBadges?.[String(value)]}
          />
        );
    }

    return <TextCell data={value as string | object | null | undefined} />;
  }, [dataType, enumBadges, relation, uiDataType, uiConfig, value]);

  const uiSettings = useMemo(() => {
    if (uiDataType) {
      switch (uiDataType) {
        case "markdown":
        case "html":
          return {
            minWidth: "700px",
            displayButtonLabels: true,
            className: "flex-col gap-y-1 items-start",
          };

        case "url":
          return {
            minWidth: "300px",
            displayButtonLabels: false,
            className: "",
          };

        case "color":
          return {
            minWidth: "300px",
            displayButtonLabels: false,
            className: "",
          };
      }
    }

    if (!dataType) {
      return {
        minWidth: "200px",
        displayButtonLabels: false,
        className: "",
      };
    }

    switch (dataType.toLowerCase()) {
      case "text":
        return {
          minWidth: "300px",
          displayButtonLabels: false,
          className: "",
        };
      case "integer":
        return {
          minWidth: "64px",
          displayButtonLabels: false,
          className: "",
        };
      case "date":
        return {
          minWidth: "300px",
          displayButtonLabels: false,
          className: "",
        };
      case "user-defined":
        return {
          minWidth: "200px",
          displayButtonLabels: false,
          className: "",
        };
      case "boolean":
        return {
          minWidth: "32px",
          displayButtonLabels: false,
          className: "",
        };
    }

    return {
      minWidth: "500px",
      displayButtonLabels: false,
      className: "",
    };
  }, [dataType, uiDataType]);

  // if the column is not editable or no inline editor provided, we just return the cell content
  if (!isEditable || !InlineEditor) {
    return getCellContent();
  }

  const isSubmitting = fetcher?.state === "submitting";

  return (
    <div
      className="group/cell relative flex w-full items-center justify-between"
      data-testid={`cell-${column.name}`}
    >
      <div className="flex-1">{getCellContent()}</div>

      <Popover open={isEditing} onOpenChange={setIsEditing} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="group-button hover:text-secondary-foreground hover:bg-foreground/5 active:bg-foreground/10 ml-2 h-6 w-6 cursor-pointer border border-transparent opacity-0 group-hover/cell:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
            }}
            data-testid="edit-button"
            data-test-column={column.name}
          >
            <EditIcon className="text-muted-foreground group-hover/button:text-secondary-foreground h-3 w-3" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          style={{ minWidth: uiSettings.minWidth }}
          className={cn("rounded-sm p-4 shadow-3xl")}
          align="start"
          onClick={(e) => e.stopPropagation()}
          alignOffset={-200}
          collisionPadding={40}
          data-testid="inline-editor-popover"
          data-test-column={column.name}
        >
          <InlineEditor
            column={column}
            value={value}
            relation={relation}
            relationConfig={relationConfig}
            isSubmitting={isSubmitting}
            onCancel={handleEditCancel}
            onSubmit={handleEditSubmit}
            displayButtonLabels={uiSettings.displayButtonLabels}
            className={uiSettings.className}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Relation cell renderer
 * @param props - The props
 * @returns The relation cell renderer
 */
function RelationCell(props: { label: string; link: string }) {
  const { label, link } = props;

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="h-6 px-1.5 py-0"
    >
      <Link
        to={`/resources${link}`}
        className="text-muted-foreground active:bg-muted inline-flex items-center gap-x-1.5 text-xs hover:underline"
      >
        <Ellipsify>{label}</Ellipsify>

        <ExternalLinkIcon className="h-3 min-h-3 w-3 min-w-3" />
      </Link>
    </Button>
  );
}

/**
 * Enum cell renderer
 * @param props - The props
 * @returns The enum cell renderer
 */
function EnumCell(props: { data: string; badge?: { variant?: string } }) {
  return (
    <Badge
      className="inline-flex min-w-max gap-x-1"
      variant={
        (props.badge?.variant as React.ComponentProps<
          typeof Badge
        >["variant"]) || "secondary"
      }
      title={props.data}
    >
      <span className="max-w-sm truncate font-normal">{props.data}</span>
    </Badge>
  );
}

/**
 * UUID cell renderer
 * @param props - The props
 * @returns The UUID cell renderer
 */
function UUIDCell(props: { data: string }) {
  const truncated = props.data ? `${props.data?.substring(24) ?? "-"}` : "";

  return (
    <CopyToClipboard
      value={props.data ?? undefined}
      className="text-muted-foreground gap-x-1 font-mono text-xs"
    >
      {truncated}
    </CopyToClipboard>
  );
}

/**
 * JSON cell renderer
 * @returns The JSON cell renderer
 */
function JSONCell() {
  return <CodeIcon className="text-muted-foreground h-3 w-3" />;
}

/**
 * Text cell renderer
 * @param props - The props
 * @returns The text cell renderer
 */
function TextCell(props: { data: string | object | null | undefined }) {
  // Handle null/undefined
  if (props.data == null) {
    return (
      <Ellipsify>
        <EmptyTextCell />
      </Ellipsify>
    );
  }

  // Handle objects by converting to JSON string
  if (typeof props.data === "object") {
    return <Ellipsify>{JSON.stringify(props.data)}</Ellipsify>;
  }

  // Handle strings and other primitives
  return <Ellipsify>{String(props.data)}</Ellipsify>;
}

/**
 * Empty text cell renderer
 * @returns The empty text cell renderer
 */
function EmptyTextCell() {
  return <span className="text-muted-foreground">-</span>;
}

/**
 * Number cell renderer
 * @param props - The props
 * @returns The number cell renderer
 */
function NumberCell(props: { data: string | number }) {
  const { formatNumber } = useNumberFormatter();

  if (props.data == null) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const formatted = formatNumber(props.data, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return <span className="text-muted-foreground text-xs">{formatted}</span>;
}

/**
 * Date cell renderer
 * @param props - The props
 * @returns The date cell renderer
 */
function DateCell(props: { data: string }) {
  const dateFormatter = useDateFormatter();

  if (!props.data) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  // human readable date
  const formattedDate = dateFormatter(
    new Date(props.data),
    "dd MMM yyyy, HH:mm",
  );

  return (
    <span className="text-muted-foreground min-w-30 flex items-center gap-x-1 text-xs">
      <CalendarIcon className="h-3 w-3" />

      {formattedDate ?? <EmptyTextCell />}
    </span>
  );
}

/**
 * Boolean cell renderer
 * @param props - The props
 * @returns The boolean cell renderer
 */
function BooleanCell(props: {
  data: boolean;
  customLabels: { true_label?: string; false_label?: string } | undefined;
}) {
  // Use custom labels if provided, otherwise fall back to translations
  const trueLabel = props.customLabels?.true_label || (
    <Trans i18nKey="dataExplorer:record.yes" />
  );

  const falseLabel = props.customLabels?.false_label || (
    <Trans i18nKey="dataExplorer:record.no" />
  );

  return (
    <Badge
      className="inline-flex gap-x-1 truncate font-normal"
      variant={props.data ? "success" : "destructive"}
    >
      {props.data ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}

      {props.data ? trueLabel : falseLabel}
    </Badge>
  );
}

/**
 * Ellipsify component
 * @param props - The props
 * @returns The ellipsify component
 */
function Ellipsify(props: React.PropsWithChildren) {
  return (
    <span className="text-muted-foreground block w-max max-w-48 truncate text-xs">
      {props.children}
    </span>
  );
}

/**
 * URL cell renderer
 * @param props - The props
 * @returns The URL cell renderer
 */
function URLCell(props: { data: string }) {
  const { formatText } = useDataFormatter();

  const formattedUrl = formatText(props.data, {
    type: "url",
    maxLength: 48,
    truncatePosition: "middle",
  });

  return (
    <CopyToClipboard
      value={props.data}
      className="text-muted-foreground hover:bg-muted/50 active:bg-muted inline-flex items-center gap-x-1.5 text-xs"
    >
      <LinkIcon className="h-3 min-h-3 w-3 min-w-3" />

      <Ellipsify>{formattedUrl}</Ellipsify>
    </CopyToClipboard>
  );
}

/**
 * Email cell renderer
 * @param props - The props
 * @returns The email cell renderer
 */
function EmailCell(props: { data: string }) {
  const { formatText } = useDataFormatter();

  const formattedEmail = formatText(props.data, {
    type: "email",
    maxLength: 48,
    truncatePosition: "middle",
  });

  return (
    <CopyToClipboard
      value={props.data}
      className="text-muted-foreground hover:bg-muted/50 active:bg-muted inline-flex items-center gap-x-1.5 text-xs"
    >
      <MailIcon className="h-3 min-h-3 w-3 min-w-3" />

      <Ellipsify>{formattedEmail}</Ellipsify>
    </CopyToClipboard>
  );
}

/**
 * Phone cell renderer
 * @param props - The props
 * @returns The phone cell renderer
 */
function PhoneCell(props: { data: string }) {
  const { formatText } = useDataFormatter();

  const formattedPhone = formatText(props.data, {
    type: "phone",
  });

  return (
    <CopyToClipboard
      value={props.data}
      className="text-muted-foreground hover:bg-muted/50 active:bg-muted inline-flex items-center gap-x-1.5 text-xs hover:underline"
    >
      <PhoneIcon className="h-3 min-h-3 w-3 min-w-3" />

      <Ellipsify>{formattedPhone}</Ellipsify>
    </CopyToClipboard>
  );
}

/**
 * Currency cell renderer
 * @param props - The props
 * @returns The currency cell renderer
 */
function CurrencyCell(props: { data: string; currency: string | undefined }) {
  const { data, currency } = props;
  const { formatCurrency } = useNumberFormatter();

  if (data == null) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const formatted = currency
    ? formatCurrency(data, currency, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : formatCurrency(data, undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return <span className="text-muted-foreground text-xs">{formatted}</span>;
}

/**
 * Percentage cell renderer
 * @param props - The props
 * @returns The percentage cell renderer
 */
function PercentageCell(props: { data: string }) {
  const { data } = props;
  const { formatPercentage } = useNumberFormatter();

  if (data == null) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const formatted = formatPercentage(data, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return <span className="text-muted-foreground text-xs">{formatted}</span>;
}

/**
 * Color cell renderer
 * @param props - The props
 * @returns The color cell renderer
 */
function ColorCell(props: { data: string }) {
  return (
    <span className="flex items-center gap-x-1 text-xs">
      <span
        className="h-4 w-4 rounded border"
        style={{ backgroundColor: props.data }}
      />
      <span className="text-muted-foreground">{props.data}</span>
    </span>
  );
}
