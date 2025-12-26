import { useNavigate } from 'react-router';

import { AlertTriangleIcon, ArrowLeftIcon } from 'lucide-react';

import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { Trans } from '@kit/ui/trans';

export function DashboardNotFound() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/dashboards');
  };

  return (
    <div className="flex h-full flex-1 items-center justify-center p-4">
      <EmptyState
        className="flex h-96 max-w-md items-center justify-center"
        data-testid="dashboard-not-found"
      >
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-lg">
            <AlertTriangleIcon className="text-destructive h-8 w-8" />
          </div>

          <EmptyStateHeading className="text-lg font-semibold">
            <Trans i18nKey="dashboard:errors.dashboardNotFound" />
          </EmptyStateHeading>

          <EmptyStateText className="text-muted-foreground text-sm">
            <Trans i18nKey="dashboard:errors.dashboardNotFoundDescription" />
          </EmptyStateText>

          <EmptyStateButton onClick={handleGoBack} data-testid="go-back-button">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            <Trans i18nKey="dashboard:actions.goToDashboards" />
          </EmptyStateButton>
        </div>
      </EmptyState>
    </div>
  );
}
