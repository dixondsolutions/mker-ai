import { useLoaderData } from 'react-router';

import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { tablesMetadataLoader } from '../../loaders';
import { SyncTablesDialog } from './sync-tables-dialog';
import { TablesTable } from './tables-table';

export function ResourcesConfigForm() {
  const data = useLoaderData<typeof tablesMetadataLoader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={5}>
            <Trans i18nKey="settings:table.pageTitle" />
          </Heading>

          <Heading level={6} className={'text-muted-foreground font-normal'}>
            <Trans i18nKey="settings:table.pageDescription" />
          </Heading>
        </div>

        <If condition={data.permissions.canUpdate}>
          <SyncTablesDialog />
        </If>
      </div>

      <TablesTable data={data.tables} canUpdate={data.permissions.canUpdate} />
    </div>
  );
}
