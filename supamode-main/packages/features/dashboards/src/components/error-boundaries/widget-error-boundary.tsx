import React, { Component, ErrorInfo, ReactNode } from 'react';

import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  widgetId?: string;
  widgetTitle?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  className?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary specifically designed for dashboard widgets
 * Provides graceful error handling and recovery options
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  private static readonly MAX_RETRY_COUNT = 3;

  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<WidgetErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Widget Error Boundary caught an error:', {
      error,
      errorInfo,
      widgetId: this.props.widgetId,
      widgetTitle: this.props.widgetTitle,
      retryCount: this.state.retryCount,
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    if (newRetryCount <= WidgetErrorBoundary.MAX_RETRY_COUNT) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: newRetryCount,
      });

      // Call the onRetry callback if provided
      this.props.onRetry?.();
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  private renderErrorDetails = () => {
    const { error, errorInfo } = this.state;

    return (
      <details className="mt-4">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
          <Trans i18nKey="dashboard:error.showDetails" />
        </summary>

        <div className="mt-2 space-y-2">
          {error && (
            <div>
              <h4 className="text-sm font-medium">
                <Trans i18nKey="dashboard:error.errorMessage" />
              </h4>

              <code className="bg-muted block w-full overflow-x-auto rounded p-2 text-xs">
                {error.message}
              </code>
            </div>
          )}

          {error?.stack && (
            <div>
              <h4 className="text-sm font-medium">
                <Trans i18nKey="dashboard:error.stackTrace" />
              </h4>
              <code className="bg-muted block w-full overflow-x-auto rounded p-2 text-xs">
                {error.stack}
              </code>
            </div>
          )}

          {errorInfo?.componentStack && (
            <div>
              <h4 className="text-sm font-medium">
                <Trans i18nKey="dashboard:error.componentStack" />
              </h4>

              <code className="bg-muted block w-full overflow-x-auto rounded p-2 text-xs">
                {errorInfo.componentStack}
              </code>
            </div>
          )}
        </div>
      </details>
    );
  };

  private renderFallback = () => {
    const { error, retryCount } = this.state;
    const { widgetTitle, widgetId } = this.props;

    const canRetry = retryCount < WidgetErrorBoundary.MAX_RETRY_COUNT;

    const isNetworkError =
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('fetch');

    const isRenderError =
      error?.message?.toLowerCase().includes('render') ||
      error?.message?.toLowerCase().includes('component');

    return (
      <Card
        className={cn('border-destructive/20 h-full', this.props.className)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <Trans i18nKey="dashboard:error.widgetErrorTitle" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {widgetTitle ? (
                <Trans
                  i18nKey="dashboard:error.namedWidgetFailed"
                  values={{ name: widgetTitle }}
                />
              ) : (
                <Trans i18nKey="dashboard:error.widgetFailed" />
              )}
            </AlertTitle>
            <AlertDescription>
              {isNetworkError && (
                <Trans i18nKey="dashboard:error.networkErrorDescription" />
              )}
              {isRenderError && (
                <Trans i18nKey="dashboard:error.renderErrorDescription" />
              )}
              {!isNetworkError && !isRenderError && (
                <Trans i18nKey="dashboard:error.genericErrorDescription" />
              )}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                <Trans
                  i18nKey="common:retry"
                  values={{
                    count: retryCount + 1,
                    max: WidgetErrorBoundary.MAX_RETRY_COUNT,
                  }}
                />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              <Trans i18nKey="common:reset" />
            </Button>
          </div>

          {retryCount >= WidgetErrorBoundary.MAX_RETRY_COUNT && (
            <Alert>
              <AlertTitle>
                <Trans i18nKey="dashboard:error.maxRetriesReached" />
              </AlertTitle>

              <AlertDescription>
                <Trans i18nKey="dashboard:error.maxRetriesDescription" />
              </AlertDescription>
            </Alert>
          )}

          {this.renderErrorDetails()}

          {widgetId && (
            <div className="text-muted-foreground text-xs">
              <Trans
                i18nKey="dashboard:error.widgetId"
                values={{ id: widgetId }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      return this.props.fallback || this.renderFallback();
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with widget error boundary
 */
export function withWidgetErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  options: {
    widgetId?: string;
    widgetTitle?: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onRetry?: () => void;
  } = {},
) {
  const WrappedComponent = (props: T) => (
    <WidgetErrorBoundary {...options}>
      <Component {...props} />
    </WidgetErrorBoundary>
  );

  WrappedComponent.displayName = `withWidgetErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Simple error fallback component for lightweight error states
 */
export function WidgetErrorFallback({
  error,
  onRetry,
  className,
}: {
  error?: Error;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center',
        className,
      )}
    >
      <AlertCircle className="text-destructive mb-2 h-8 w-8" />

      <h3 className="text-destructive mb-1 text-sm font-medium">
        <Trans i18nKey="dashboard:error.somethingWentWrong" />
      </h3>

      <p className="text-muted-foreground mb-4 text-xs">
        {error?.message || <Trans i18nKey="dashboard:error.unknownError" />}
      </p>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-3 w-3" />
          <Trans i18nKey="dashboard:error.tryAgain" />
        </Button>
      )}
    </div>
  );
}
