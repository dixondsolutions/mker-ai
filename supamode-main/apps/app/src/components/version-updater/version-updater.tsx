import { useMemo, useState } from 'react';

import { RefreshCwIcon, RocketIcon } from 'lucide-react';

import { dismissVersionComparison } from '@kit/shared/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';

import type {
  VersionCheckData,
  VersionCheckType,
} from './use-version-checkers';
import { useVersionUpdater } from './version-updater-context';

/**
 * Version update notification dialog
 * Shows alerts for:
 * 1. Server/client sync issues (high priority)
 * 2. Available upstream version updates (low priority)
 *
 * Now fully testable with dependency injection via VersionUpdaterProvider
 */
export function VersionUpdater() {
  const { serverSyncData, externalUpdateData } = useVersionUpdater();

  const [dismissed, setDismissed] = useState<Set<VersionCheckType>>(new Set());

  // Deterministically compute which dialog to show (no useEffect needed)
  const currentDialog = useMemo<VersionCheckData | null>(() => {
    // Priority: server sync > external updates
    if (serverSyncData?.hasUpdate && !dismissed.has('server-sync')) {
      return serverSyncData;
    }

    if (externalUpdateData?.hasUpdate && !dismissed.has('external')) {
      return externalUpdateData;
    }

    return null;
  }, [serverSyncData, externalUpdateData, dismissed]);

  const handleDismiss = (type: VersionCheckType) => {
    // For external updates, persist dismissal to localStorage
    if (type === 'external' && currentDialog) {
      dismissVersionComparison(
        currentDialog.currentVersion,
        currentDialog.latestVersion,
      );
    }

    // Add to dismissed set (session-only for server sync)
    setDismissed((prev) => new Set(prev).add(type));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!currentDialog) {
    return null;
  }

  const isServerSync = currentDialog.type === 'server-sync';

  return (
    <AlertDialog open={true} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={'flex items-center space-x-4'}>
            {isServerSync ? (
              <RefreshCwIcon className={'h-4'} />
            ) : (
              <RocketIcon className={'h-4'} />
            )}
            {isServerSync ? (
              <Trans i18nKey="common:clientServerOutOfSync" />
            ) : (
              <Trans i18nKey="common:newVersionAvailable" />
            )}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {isServerSync ? (
              <div>
                <Trans i18nKey="common:clientServerOutOfSyncDescription" />
                <div className="text-muted-foreground mt-2 text-sm">
                  Client: {currentDialog.currentVersion} → Server:{' '}
                  {currentDialog.latestVersion}
                </div>
              </div>
            ) : (
              <div>
                <Trans i18nKey="common:newVersionAvailableDescription" />
                <div className="text-muted-foreground mt-2 text-sm">
                  Current: {currentDialog.currentVersion} → Latest:{' '}
                  {currentDialog.latestVersion}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {!isServerSync && (
            <Button
              variant={'outline'}
              onClick={() => handleDismiss(currentDialog.type)}
            >
              <Trans i18nKey="common:back" />
            </Button>
          )}

          <Button onClick={handleRefresh}>
            {isServerSync ? (
              <Trans i18nKey="common:refreshPage" />
            ) : (
              <Trans i18nKey="common:newVersionSubmitButton" />
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
