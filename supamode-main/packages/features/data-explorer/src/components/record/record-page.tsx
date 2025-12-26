import { useEffect, useMemo, useRef } from 'react';

import { Link, useFetcher, useLoaderData, useSearchParams } from 'react-router';

import {
  ArrowLeftIcon,
  Grid2X2,
  InfoIcon,
  SquarePenIcon,
  TrashIcon,
} from 'lucide-react';

import { getLookupRelations } from '@kit/data-explorer-core/utils';
import { formatRecord } from '@kit/formatters';
import { buildResourceUrl } from '@kit/shared/utils';
import { RelationConfig, TableUiConfig } from '@kit/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
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
import { hasRenderableFields } from '../../utils/layout-utils';
import { useScrollableDivShadow } from '../../utils/use-scrollable-div-shadow';
import { DataExplorerTabs } from '../data-explorer-tabs';
import { CustomLayoutRenderer } from './custom-layout-renderer';
import { DefaultLayoutRenderer } from './default-layout-renderer';
import { RecordValueProvider } from './record-value-context';

export function RecordPage() {
  const { data, metadata, foreignKeyRecords, permissions } =
    useLoaderData() as Awaited<ReturnType<typeof recordLoader>>;

  const [searchParams] = useSearchParams();

  const relationsConfig = useMemo<RelationConfig[]>(() => {
    return getLookupRelations(metadata.table.relationsConfig);
  }, [metadata.table.relationsConfig]);

  // Check for custom layout in table metadata
  const uiConfig = metadata.table.uiConfig as TableUiConfig;
  const customLayout = uiConfig?.recordLayout;

  const hasCustomLayout = useMemo(() => {
    if (
      !customLayout ||
      !customLayout.display ||
      customLayout.display.length === 0
    ) {
      return false;
    }

    // Check if the custom layout actually has renderable fields
    return hasRenderableFields(customLayout, metadata.columns, 'display');
  }, [customLayout, metadata.columns]);

  const displayNameFormat = metadata.table.displayFormat || '';

  const entityName =
    metadata.table.displayName || metadata.table.tableName.replace(/_/g, ' ');

  const entityDisplayName = useMemo(() => {
    return displayNameFormat
      ? formatRecord(displayNameFormat, data)
      : ((data['id'] ??
          data['name'] ??
          data['title'] ??
          data['description'] ??
          '') as string);
  }, [data, displayNameFormat]);

  // Handle tab management with display name and entity display name
  useRecordTabManagement(
    metadata.table?.displayName,
    String(entityDisplayName),
  );

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const { className } = useScrollableDivShadow(scrollableDivRef);

  const resourceLink = `/resources/${metadata.table.schemaName}/${metadata.table.tableName}`;

  const action = buildResourceUrl({
    schema: metadata.table.schemaName,
    table: metadata.table.tableName,
    record: data,
    tableMetadata: uiConfig,
  });

  useEffect(() => {
    // scroll to the top of the page when the page is mounted
    setTimeout(() => {
      scrollableDivRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 0);
  }, [action]);

  return (
    <div className="relative flex h-screen w-full flex-1 flex-col overflow-y-hidden">
      <DataExplorerTabs />

      <div
        className={cn(
          className,
          'sticky top-0 z-10 flex h-12 items-center justify-between p-2',
        )}
      >
        <div className="flex flex-col space-y-2">
          <Breadcrumb className="flex items-center space-x-2">
            <BreadcrumbList className={'p-0.5'}>
              <BreadcrumbItem>
                <Link
                  className="hover:bg-muted/30 text-secondary-foreground flex items-center gap-x-1.5 rounded-md py-1 hover:underline"
                  to={resourceLink}
                >
                  <Grid2X2 className="text-muted-foreground h-4 w-4" />

                  <span>{entityName}</span>
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <span
                  className="max-w-64 truncate"
                  data-testid="record-breadcrumb-item"
                >
                  {entityDisplayName}
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
                </span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex space-x-2">
          <Button asChild variant="link" size={'sm'}>
            <Link
              className="flex items-center space-x-2"
              to={`../${metadata.table.schemaName}/${metadata.table.tableName}`}
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />

              <span>
                <Trans i18nKey="common:back" />
              </span>
            </Link>
          </Button>

          <If condition={permissions.canUpdate}>
            <Button
              data-testid="edit-record-button"
              form="record-form"
              asChild
              variant="outline"
              size={'sm'}
            >
              <Link
                className="flex items-center space-x-2"
                to={`./edit?${searchParams.toString()}`}
              >
                <SquarePenIcon className="h-3.5 w-3.5" />

                <span>
                  <Trans i18nKey="dataExplorer:record.edit" />
                </span>
              </Link>
            </Button>
          </If>

          <If condition={permissions.canDelete}>
            <DeleteRecordAlertDialog>
              <Button
                data-testid="request-delete-record-button"
                variant="destructive"
                className="flex items-center space-x-2"
                size={'sm'}
              >
                <TrashIcon className="h-3.5 w-3.5" />

                <span>
                  <Trans i18nKey="dataExplorer:record.delete" />
                </span>
              </Button>
            </DeleteRecordAlertDialog>
          </If>
        </div>
      </div>

      <RecordValueProvider value={data}>
        <div className="overflow-y-auto pb-16" ref={scrollableDivRef}>
          <If condition={hasCustomLayout && customLayout}>
            {(layout) => (
              <CustomLayoutRenderer
                layout={layout}
                columns={metadata.columns}
                relationsConfig={relationsConfig}
                data={data}
                foreignKeyRecords={foreignKeyRecords}
                permissions={permissions}
                action={action}
              />
            )}
          </If>

          <If condition={!hasCustomLayout}>
            <DefaultLayoutRenderer
              columns={metadata.columns}
              relationsConfig={relationsConfig}
              data={data}
              foreignKeyRecords={foreignKeyRecords}
              permissions={permissions}
              action={action}
            />
          </If>
        </div>
      </RecordValueProvider>
    </div>
  );
}

function DeleteRecordAlertDialog(props: React.PropsWithChildren) {
  const { children } = props;

  const fetcher = useFetcher();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <form>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans i18nKey="dataExplorer:record.deleteRecordAlertTitle" />
            </AlertDialogTitle>

            <AlertDialogDescription>
              <Trans i18nKey="dataExplorer:record.deleteRecordAlertDescription" />
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8">
            <AlertDialogCancel>
              <Trans i18nKey="common:cancel" />
            </AlertDialogCancel>

            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                return fetcher.submit(null, {
                  method: 'DELETE',
                });
              }}
            >
              <Trans i18nKey="common:deleteResource" />
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
