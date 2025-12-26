import { useEffect } from 'react';

import { useNavigate, useRouteError, useSearchParams } from 'react-router';

import { AlertTriangle, Bug, Home, LogOut, RefreshCw } from 'lucide-react';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { I18nProvider } from '../i18n/i18n-provider';
import { i18nResolver } from '../i18n/i18n.resolver';
import { AppLogo } from './app-logo';

function formatErrorMessage(message: string): string {
  try {
    const parsed = JSON.parse(message);
    const errorValue = parsed.error || parsed.message || message;

    return typeof errorValue === 'object'
      ? JSON.stringify(errorValue, null, 2)
      : String(errorValue);
  } catch {
    return message;
  }
}

export function GlobalErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const signOut = useSignOut();

  const [searchParams] = useSearchParams();
  const message = searchParams.get('message');
  const next = searchParams.get('next');

  const errorMessage = error || message;

  const isNetworkError =
    error instanceof Error && error.message.includes('fetch');

  const is404 =
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 404;

  useEffect(() => {
    console.error(`Unhandled error`, errorMessage);
  }, [errorMessage]);

  return (
    <I18nProvider resolver={i18nResolver}>
      <div className="from-background to-muted/20 flex h-screen flex-col items-center justify-center bg-gradient-to-br p-4">
        <div className="flex w-full max-w-lg flex-col items-center gap-4">
          <div className="mb-4 flex justify-center transition-all duration-300 hover:scale-105">
            <AppLogo />
          </div>

          <Card className="animate-in fade-in slide-in-from-bottom-4 border-border/50 bg-background/80 w-full shadow-xl backdrop-blur-sm">
            <CardHeader className="space-y-3 pb-6 text-center">
              <div className="bg-destructive/10 mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-8 w-8" />
              </div>
              <CardTitle className="text-foreground text-2xl font-bold">
                {is404 ? (
                  'Page Not Found'
                ) : (
                  <Trans i18nKey="common:errors.generic" />
                )}
              </CardTitle>
              <p className="text-muted-foreground mx-auto max-w-sm text-sm">
                {is404
                  ? 'The page you are looking for does not exist or has been moved.'
                  : isNetworkError
                    ? 'Unable to connect to the server. Please check your internet connection.'
                    : 'We apologize for the inconvenience.'}
              </p>
            </CardHeader>

            <CardContent className="space-y-4 px-6">
              <Alert
                variant="destructive"
                className={cn(
                  'animate-in fade-in slide-in-from-top-2',
                  'border-destructive/20 bg-destructive/5',
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-destructive font-medium">
                  {error instanceof Error ? (
                    'Error Details'
                  ) : (
                    <Trans i18nKey="common:errors.unknown" />
                  )}
                </AlertTitle>

                <AlertDescription className="text-destructive/80 mt-2">
                  {error instanceof Error ? (
                    <code className="bg-destructive/10 rounded px-2 py-1 text-xs break-all">
                      {formatErrorMessage(error.message)}
                    </code>
                  ) : message ? (
                    formatErrorMessage(message)
                  ) : (
                    <Trans i18nKey="common:errors.unknown" />
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-6">
              <div className="flex w-full gap-2">
                <Button
                  variant="default"
                  size="lg"
                  className="flex-1 transition-all hover:shadow-md"
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

                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 transition-all hover:shadow-md"
                  onClick={() => navigate('/', { replace: true })}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <Button
                variant="link"
                className="w-full transition-all hover:shadow-md"
                onClick={() => signOut.mutate()}
                disabled={signOut.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <Trans i18nKey="auth:signOut" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() =>
                  window.open(
                    'https://github.com/makerkit/supamode/issues',
                    '_blank',
                  )
                }
              >
                <Bug className="mr-2 h-4 w-4" />
                <Trans i18nKey="common:openBugReport" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </I18nProvider>
  );
}
