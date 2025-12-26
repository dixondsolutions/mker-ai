import { useCallback, useMemo, useRef, useState } from 'react';

import { Link, useFetcher, useLoaderData, useNavigate } from 'react-router';

import { CheckCircleIcon, Grid2X2 } from 'lucide-react';
import type { FormState } from 'react-hook-form';

import { getLookupRelations } from '@kit/data-explorer-core/utils';
import type { RelationConfig, TableUiConfig } from '@kit/types';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { tableMetadataLoader } from '../../api/loaders/table-structure-loader';
import { useCreateTabManagement } from '../../hooks/use-tab-management';
import { useScrollableDivShadow } from '../../utils/use-scrollable-div-shadow';
import { DataExplorerTabs } from '../data-explorer-tabs';
import { RecordForm } from './record-form';

export function RecordCreatePage() {
  const { table, columns } = useLoaderData<typeof tableMetadataLoader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Get entity name for display
  const entityName = table.displayName || table.tableName;

  // Handle tab management with display name
  useCreateTabManagement(table?.displayName);

  // Handle creating a new record
  const handleCreateRecord = useCallback(
    (recordData: Record<string, unknown>) => {
      // Submit the creation request to the server
      return fetcher.submit(
        JSON.stringify({
          data: recordData,
        }),
        { method: 'POST', encType: 'application/json' },
      );
    },
    [fetcher],
  );

  // URL to go back to the table listing
  const backUrl = `/resources/${table.schemaName}/${table.tableName}`;

  // Create an empty record with default values
  const emptyRecord = useMemo(() => {
    return columns.reduce(
      (acc, column) => {
        // initialize with empty string for text and character varying columns
        // this prevents controlled inputs errors
        if (
          column.ui_config?.data_type &&
          ['text', 'character varying'].includes(column.ui_config.data_type)
        ) {
          acc[column.name] = null;
        }

        return acc;
      },
      {} as Record<string, unknown>,
    );
  }, [columns]);

  const isSubmitting = fetcher.state === 'submitting';

  const onChange = useCallback(
    (_: unknown, formState: FormState<Record<string, unknown>>) => {
      // isDirty is not reliable, so we use dirtyFields instead
      const hasDirtyFields = Object.values(formState.dirtyFields).length > 0;

      setUnsavedChanges(hasDirtyFields);
    },
    [],
  );

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const { className } = useScrollableDivShadow(scrollableDivRef);

  const relationsConfig = useMemo<RelationConfig[]>(() => {
    return getLookupRelations(table.relationsConfig);
  }, [table.relationsConfig]);

  return (
    <div className="relative flex h-screen w-full flex-1 flex-col overflow-y-hidden">
      <DataExplorerTabs />

      <div
        className={cn(
          className,
          'sticky top-0 z-10 flex h-12 items-center justify-between px-2.5 py-0.5',
        )}
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link
                className="hover:bg-muted/30 text-secondary-foreground flex items-center gap-x-1.5 rounded-md py-1 hover:underline"
                to={backUrl}
              >
                <Grid2X2 className="text-muted-foreground h-4 w-4" />
                <span>{entityName}</span>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <span>
                <Trans i18nKey="record:create" />
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-x-4">
          <If condition={unsavedChanges}>
            <span className="text-muted-foreground text-xs">
              <Trans i18nKey="common:unsavedChanges" />
            </span>
          </If>

          <Button
            disabled={isSubmitting}
            data-testid="record-form-submit"
            form="record-form"
            type="submit"
            size="sm"
            className="flex items-center gap-x-2"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />

            {isSubmitting ? (
              <Trans i18nKey={'common:saving'} />
            ) : (
              <Trans i18nKey="common:create" />
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
          relations={relationsConfig}
          fields={columns}
          recordData={emptyRecord}
          mode="create"
          isSubmitting={isSubmitting}
          schema={table.schemaName}
          table={table.tableName}
          onCancel={() => {
            navigate(backUrl);
          }}
          onChange={onChange}
          onSubmit={handleCreateRecord}
          customLayout={
            (table.uiConfig as TableUiConfig | null)?.recordLayout || undefined
          }
        />
      </div>
    </div>
  );
}
