import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useFetcher, useLoaderData, useNavigate } from 'react-router';

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  Grid2X2,
  InfoIcon,
} from 'lucide-react';
import type { FormState } from 'react-hook-form';

import { getLookupRelations } from '@kit/data-explorer-core/utils';
import { formatRecord } from '@kit/formatters';
import { buildResourceUrl } from '@kit/shared/utils';
import { RelationConfig, TableUiConfig } from '@kit/types';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { recordLoader } from '../../api/loaders/record-loader';
import { useRecordTabManagement } from '../../hooks/use-tab-management';
import { useScrollableDivShadow } from '../../utils/use-scrollable-div-shadow';
import { DataExplorerTabs } from '../data-explorer-tabs';
import { RecordForm } from './record-form';

export function RecordEditPage() {
  const { data, metadata, foreignKeyRecords } = useLoaderData() as Awaited<
    ReturnType<typeof recordLoader>
  >;

  const fetcher = useFetcher<{
    success: boolean;
    data: Record<string, unknown>;
  }>();

  const navigate = useNavigate();
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const isSubmitting = fetcher.state === 'submitting';

  // Extract the display format for the entity if available
  const displayNameFormat = metadata.table.displayFormat;

  // Get entity name for display
  const entityName = metadata.table.displayName || metadata.table.tableName;

  const uiConfig = metadata.table.uiConfig ?? {
    primary_keys: [],
    unique_constraints: [],
  };

  // Check for custom layout in table metadata for edit mode
  const customLayout = useMemo(() => {
    const tableUiConfig = metadata.table.uiConfig as TableUiConfig;
    const recordLayout = tableUiConfig?.recordLayout;

    // Only return the layout if it has edit mode configuration
    if (recordLayout && recordLayout.edit && recordLayout.edit.length > 0) {
      return recordLayout;
    }

    return undefined;
  }, [metadata.table.uiConfig]);

  // URL to go back to the record details page
  const backUrl = buildResourceUrl({
    schema: metadata.table.schemaName,
    table: metadata.table.tableName,
    record: data,
    tableMetadata: uiConfig as TableUiConfig,
  });

  const mode = 'edit';

  // Generate a display name for the record
  const entityDisplayName = displayNameFormat
    ? formatRecord(displayNameFormat, data) || ''
    : ((data['id'] ??
        data['name'] ??
        data['title'] ??
        data['description'] ??
        '') as string);

  // Handle tab management with display name and entity display name
  useRecordTabManagement(
    metadata.table?.displayName,
    String(entityDisplayName),
  );

  // Handle saving the edited record
  const handleSaveRecord = useCallback(
    (updatedData: Record<string, unknown>) => {
      return fetcher.submit(updatedData as unknown as FormData, {
        method: 'PUT',
        encType: 'application/json',
      });
    },
    [fetcher],
  );

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const { className } = useScrollableDivShadow(scrollableDivRef);

  const goBackToRecord = useCallback(() => {
    return navigate(backUrl);
  }, [navigate, backUrl]);

  const relationsConfig = useMemo<RelationConfig[]>(() => {
    return getLookupRelations(metadata.table.relationsConfig);
  }, [metadata.table.relationsConfig]);

  const onChange = useCallback(
    (_: unknown, formState: FormState<Record<string, unknown>>) => {
      // isDirty is not reliable, so we use dirtyFields instead
      const hasDirtyFields = Object.values(formState.dirtyFields).length > 0;

      setUnsavedChanges(hasDirtyFields);
    },
    [],
  );

  const foreignRecords = foreignKeyRecords.reduce(
    (acc, item) => {
      if (!item?.metadata?.table.displayFormat) {
        return acc;
      }

      const key = [
        item?.metadata.table.schemaName,
        item?.metadata.table.tableName,
      ].join('.');

      return {
        ...acc,
        [key]: {
          displayFormat: item?.metadata.table.displayFormat,
          data: item.data,
        },
      };
    },
    {} as Record<
      string,
      {
        displayFormat: string;
        data: Record<string, unknown>;
      }
    >,
  );

  useEffect(() => {
    // scroll to the top of the page when the page is mounted
    setTimeout(() => {
      scrollableDivRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 0);
  }, [backUrl]);

  return (
    <div className="relative flex h-screen w-full flex-1 flex-col overflow-y-hidden">
      <DataExplorerTabs />

      <div
        className={cn(
          className,
          'sticky top-0 z-10 flex h-12 items-center justify-between p-2',
        )}
      >
        <Breadcrumb>
          <BreadcrumbList className={'p-0.5'}>
            <BreadcrumbItem>
              <Link
                className="hover:bg-muted/30 text-secondary-foreground flex items-center gap-x-1.5 rounded-md py-1 hover:underline"
                to={`/resources/${metadata.table.schemaName}/${metadata.table.tableName}`}
              >
                <Grid2X2 className="text-muted-foreground h-4 w-4" />
                <span>{entityName}</span>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <Link
                className="hover:bg-muted/30 text-secondary-foreground flex items-center gap-x-1.5 rounded-md py-1 hover:underline"
                to={backUrl}
              >
                <If condition={entityDisplayName}>
                  <span className="max-w-64 truncate">{entityDisplayName}</span>
                </If>

                <If condition={entityDisplayName === ''}>
                  <Tooltip>
                    <TooltipTrigger className={'flex items-center gap-2'}>
                      <span>
                        <Trans i18nKey={'dataExplorer:record.noName'} />
                      </span>
                      <InfoIcon className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <Trans i18nKey={'dataExplorer:record.noNameTooltip'} />
                    </TooltipContent>
                  </Tooltip>
                </If>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <span>
                <Trans i18nKey="record:edit" />
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-x-2.5">
          <If condition={unsavedChanges}>
            <span className="text-muted-foreground text-xs">
              <Trans i18nKey="common:unsavedChanges" />
            </span>
          </If>

          <Button size="sm" variant="outline" asChild>
            <Link to={backUrl} className="flex items-center space-x-2">
              <ArrowLeftIcon className="h-3.5 w-3.5" />

              <span>
                <Trans i18nKey="record:back" />
              </span>
            </Link>
          </Button>

          <Button
            data-testid="record-form-submit"
            disabled={isSubmitting || !unsavedChanges}
            form="record-form"
            type="submit"
            size="sm"
            className="flex items-center gap-x-2"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />

            {isSubmitting ? (
              <Trans i18nKey={'common:saving'} />
            ) : (
              <Trans i18nKey="common:save" />
            )}
          </Button>
        </div>
      </div>

      <div
        className="flex h-full flex-1 flex-col overflow-y-auto"
        ref={scrollableDivRef}
      >
        <RecordForm
          className="pb-16"
          fields={metadata.columns}
          relations={relationsConfig}
          recordData={data}
          mode={mode}
          isSubmitting={isSubmitting}
          foreignRecords={foreignRecords}
          schema={metadata.table.schemaName}
          table={metadata.table.tableName}
          customLayout={customLayout}
          onSubmit={handleSaveRecord}
          onCancel={goBackToRecord}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
