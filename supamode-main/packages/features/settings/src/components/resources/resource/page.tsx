import { Link, useLoaderData, useSearchParams } from 'react-router';

import {
  CheckCircleIcon,
  Layout,
  SettingsIcon,
  XCircleIcon,
} from 'lucide-react';

import { tableMetadataLoader } from '@kit/settings/loaders';
import { Badge } from '@kit/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { If } from '@kit/ui/if';
import { PageHeader, PageHeaderActions } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { ResourceColumnsTable } from './columns-table';
import { EditTableMetadataDialog } from './edit-table-metadata-dialog';

export function ResourceSettingsPage() {
  const { data, permissions } = useLoaderData<typeof tableMetadataLoader>();
  const [params, setSearchParams] = useSearchParams();
  const isEditMetadataDialogOpen = !!params.get('edit');

  const resourceName = data.displayName || data.tableName || 'Resource';

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <div className="flex flex-col space-y-4">
        <PageHeader
          title={resourceName}
          description={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link to="/settings/resources">
                    <Trans i18nKey="settings:table.pageTitle" />
                  </Link>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>{resourceName}</BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
        >
          <PageHeaderActions>
            <If
              condition={
                import.meta.env['VITE_ENABLE_EXPERIMENTAL_LAYOUT_DESIGNER'] ===
                'true'
              }
            >
              <Link
                to={`/settings/resources/${data.schemaName}/${data.tableName}/layout`}
              >
                <Button disabled={!permissions.canUpdate} variant="outline">
                  <Layout className="mr-2 h-4 w-4" />
                  <Trans i18nKey="settings:table.designLayout" />
                </Button>
              </Link>
            </If>

            <EditTableMetadataDialog
              table={data}
              defaultOpen={isEditMetadataDialogOpen}
              onClose={() => {
                if (!params.has('edit')) {
                  return;
                }

                setSearchParams({});
              }}
            >
              <Button disabled={!permissions.canUpdate}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="settings:table.configureTable" />
              </Button>
            </EditTableMetadataDialog>
          </PageHeaderActions>
        </PageHeader>

        <Card data-testid="resource-details-card">
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:table.details" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:table.detailsDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.displayName" />
                </p>

                <p
                  data-testid="resource-display-name"
                  className="text-muted-foreground text-sm"
                >
                  {data.displayName || '-'}
                </p>
              </div>

              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.tableName" />
                </p>

                <p
                  data-testid="resource-table-name"
                  className="text-muted-foreground text-sm"
                >
                  {data.tableName || '-'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.schemaName" />
                </p>

                <p
                  data-testid="resource-schema-name"
                  className="text-muted-foreground text-sm"
                >
                  {data.schemaName || '-'}
                </p>
              </div>

              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.visibility" />
                </p>

                <div className="text-muted-foreground text-sm">
                  <If
                    condition={data.isVisible}
                    fallback={
                      <Badge
                        data-testid="resource-visibility-badge"
                        variant="warning"
                      >
                        <XCircleIcon className="mr-2 h-3.5 w-3.5" />
                        <Trans i18nKey="resources:hidden" />
                      </Badge>
                    }
                  >
                    <Badge
                      data-testid="resource-visibility-badge"
                      variant="success"
                    >
                      <CheckCircleIcon className="mr-2 h-3.5 w-3.5" />
                      <Trans i18nKey="resources:visible" />
                    </Badge>
                  </If>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.displayFormat" />
                </p>

                <div
                  data-testid="resource-display-format"
                  className="text-muted-foreground text-sm"
                >
                  {data.displayFormat || '-'}
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  <Trans i18nKey="settings:table.description" />
                </p>

                <p
                  data-testid="resource-description"
                  className="text-muted-foreground text-sm"
                >
                  {data.description || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ResourceColumnsTable data={data} canUpdate={permissions.canUpdate} />
    </div>
  );
}
