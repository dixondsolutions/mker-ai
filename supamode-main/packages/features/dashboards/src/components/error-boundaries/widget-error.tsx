import { useState } from 'react';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

interface WidgetErrorProps {
  title?: React.ReactNode;
  error?: Error | string;
  onRetry?: () => void;
}

/**
 * Simple widget error display
 * Shows error message and optional retry button
 */
export function WidgetError({ title, error, onRetry }: WidgetErrorProps) {
  const { t } = useTranslation();

  const displayTitle = title || (
    <Trans i18nKey="dashboard:error.widgetErrorTitle" />
  );

  const errorMessage =
    error instanceof Error
      ? error.message
      : error || t('dashboard:error.somethingWentWrong');

  return (
    <Card className="border-destructive/20 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          {displayTitle}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />

          <AlertTitle>
            <Trans i18nKey="dashboard:error.widgetFailed" />
          </AlertTitle>

          <AlertDescription className="mt-2">{errorMessage}</AlertDescription>
        </Alert>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            <Trans i18nKey="common:retry" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple error boundary hook
 * Catches errors and shows simple error state
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = () => setError(null);

  const captureError = (error: Error) => {
    setError(error);
    console.error('Widget error:', error);
  };

  return { error, resetError, captureError };
}
