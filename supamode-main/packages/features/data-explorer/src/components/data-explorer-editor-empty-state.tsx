import { Link } from 'react-router';

import { FolderOpen, History } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  EmptyState,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { useDataExplorerTabs } from '../hooks/use-data-explorer-tabs';
import { DataExplorerTabs } from './data-explorer-tabs';

export function DataExplorerEmptyState() {
  const { tabs } = useDataExplorerTabs();

  const recentTabsFiltered = tabs.filter((tab) => !tab.isEmpty).slice(-5); // Don't show empty tabs in recent

  return (
    <div className={'flex flex-1 flex-col'}>
      <DataExplorerTabs />

      <EmptyState
        className={
          'm-2 flex h-full flex-1 flex-col items-center justify-center'
        }
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <FolderOpen className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />

          <EmptyStateHeading className="text-foreground mb-2 text-lg font-medium">
            <Trans i18nKey="dataExplorer:emptyState.title" />
          </EmptyStateHeading>

          <EmptyStateText className="text-muted-foreground mb-6 text-sm">
            <Trans i18nKey="dataExplorer:emptyState.description" />
          </EmptyStateText>

          <If condition={recentTabsFiltered.length > 0}>
            <div className="flex w-full max-w-sm flex-col space-y-3">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <History className="h-4 w-4" />

                <span>
                  <Trans i18nKey="dataExplorer:emptyState.recentTables" />
                </span>
              </div>

              <div className="grid w-full gap-2">
                {recentTabsFiltered.map((tab) => (
                  <Button
                    key={tab.id}
                    variant="outline"
                    className="h-auto w-full justify-start px-3 py-2 text-left"
                    asChild
                  >
                    <Link to={tab.path} className={'flex flex-col items-start'}>
                      <span className="text-sm font-medium">{tab.title}</span>

                      <If condition={tab.schema && tab.table}>
                        <span className="text-muted-foreground text-xs">
                          {tab.schema}.{tab.table}
                        </span>
                      </If>
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </If>
        </div>
      </EmptyState>
    </div>
  );
}
