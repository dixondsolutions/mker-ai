import { useEffect } from 'react';

import {
  Link,
  useNavigate,
  useRouteError,
  useSearchParams,
} from 'react-router';

import { AlertTriangle, Bug, Home, LogOut, RefreshCw } from 'lucide-react';

import { Button } from '../shadcn/button';
import { EmptyState, EmptyStateButton, EmptyStateHeading } from './empty-state';
import { Trans } from './trans';

export function ContextualErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const isNetworkError =
    error instanceof Error && error.message.includes('fetch');

  const is404 =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 404;

  useEffect(() => {
    console.error('Contextual error:', error);
  }, [error]);

  return (
    <EmptyState className="m-4 flex min-h-[400px] flex-1 flex-col items-center justify-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
          <AlertTriangle className="text-destructive h-8 w-8" />
        </div>

        <EmptyStateHeading className="text-xl font-semibold">
          {is404 ? (
            'Content Not Found'
          ) : (
            <Trans i18nKey="common:errors.generic" />
          )}
        </EmptyStateHeading>

        <div>
          <div className="space-y-3">
            <div className="text-muted-foreground">
              {is404
                ? 'The content you are looking for is not available or has been moved.'
                : isNetworkError
                  ? 'Unable to load content. Please check your connection and try again.'
                  : 'Something went wrong while loading this content.'}
            </div>

            {error instanceof Error && (
              <div className="bg-destructive/5 border-destructive/20 mt-4 rounded-lg border p-3">
                <div className="text-destructive/80 mb-1 text-sm font-medium">
                  Error Details:
                </div>

                <code className="text-destructive/70 text-xs break-all">
                  {(() => {
                    try {
                      const parsed = JSON.parse(error.message);

                      return parsed.error || parsed.message || error.message;
                    } catch {
                      return error.message;
                    }
                  })()}
                </code>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full max-w-xs gap-2">
          <EmptyStateButton asChild>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (next && next !== 'null') {
                  navigate(next);
                } else {
                  navigate('.', { replace: true });
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <Trans i18nKey="common:reload" />
            </Button>
          </EmptyStateButton>

          <EmptyStateButton asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </EmptyStateButton>
        </div>

        <Button
          asChild
          variant="link"
          size="sm"
          className="w-full max-w-xs transition-all hover:shadow-md"
        >
          <Link to="/auth/sign-out">
            <LogOut className="mr-2 h-4 w-4" />
            <Trans i18nKey="auth:signOut" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-2 transition-colors"
          onClick={() =>
            window.open('https://github.com/makerkit/supamode/issues', '_blank')
          }
        >
          <Bug className="mr-2 h-4 w-4" />
          <Trans i18nKey="common:openBugReport" />
        </Button>
      </div>
    </EmptyState>
  );
}
