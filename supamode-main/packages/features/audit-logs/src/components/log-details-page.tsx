import { useCallback, useMemo } from 'react';

import { Link, useLoaderData } from 'react-router';

import {
  CheckIcon,
  Clock,
  Database,
  ShieldAlert,
  TableIcon,
  User,
  XIcon,
} from 'lucide-react';

import { useDateFormatter } from '@kit/formatters/hooks';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CopyToClipboard } from '@kit/ui/copy-to-clipboard';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { ScrollArea } from '@kit/ui/scroll-area';
import { CodeBlock } from '@kit/ui/shiki';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { auditLogDetailsBridgeLoader } from '../api/loaders/bridge-loaders';
import { SeverityBadge } from './severity-badge';

export function LogDetailsPage() {
  const { log, user } =
    useLoaderData<Awaited<ReturnType<typeof auditLogDetailsBridgeLoader>>>();

  const dateFormatter = useDateFormatter();

  // Get the first log entry since the API returns an array
  const logEntry = Array.isArray(log) ? log[0] : log;

  // Get operation details
  const {
    id,
    operation,
    createdAt,
    schemaName,
    tableName,
    recordId,
    oldData,
    newData,
    severity,
    accountId,
    metadata,
  } = logEntry;

  // Build diff between old and new data if both exist
  const diffData = useMemo(() => {
    if (!oldData && !newData) return [];

    // Get all keys from both objects
    const allKeys = new Set([
      ...(oldData ? Object.keys(oldData) : []),
      ...(newData ? Object.keys(newData) : []),
    ]);

    // Create diff objects
    return Array.from(allKeys)
      .map((key) => {
        const oldValue = oldData?.[key];
        const newValue = newData?.[key];

        return {
          key,
          oldValue,
          newValue,
          isDifferent: JSON.stringify(oldValue) !== JSON.stringify(newValue),
        };
      })
      .sort((a, b) => {
        // Sort by difference first, then by key
        if (a.isDifferent && !b.isDifferent) {
          return -1;
        }

        if (!a.isDifferent && b.isDifferent) {
          return 1;
        }

        return a.key.localeCompare(b.key);
      });
  }, [oldData, newData]);

  // Format a value for display
  const formatValue = useCallback((value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    if (typeof value === 'object')
      return (
        <pre className="max-h-40 overflow-auto text-xs whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      );

    if (typeof value === 'boolean')
      return value ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <XIcon className="h-4 w-4 text-red-500" />
      );

    if (typeof value === 'string' && value.length > 100)
      return <span>{value.substring(0, 100)}...</span>;

    return <span>{String(value)}</span>;
  }, []);

  // Get operation icon and color
  const getOperationDetails = useCallback(() => {
    switch (operation.toUpperCase()) {
      case 'INSERT':
        return {
          color: 'text-green-500',
          icon: <CheckIcon className="h-5 w-5" />,
        };

      case 'UPDATE':
        return {
          color: 'text-blue-500',
          icon: <Database className="h-5 w-5" />,
        };

      case 'DELETE':
        return { color: 'text-red-500', icon: <XIcon className="h-5 w-5" /> };

      default:
        return {
          color: 'text-gray-500',
          icon: <Database className="h-5 w-5" />,
        };
    }
  }, [operation]);

  const operationDetails = useMemo(
    () => getOperationDetails(),
    [getOperationDetails],
  );

  // Get user information from metadata or accountId
  const getUserInfo = useCallback(() => {
    // If we have metadata with user info, use that
    if (metadata && typeof metadata === 'object') {
      const metaObj = metadata as Record<string, unknown>;

      if (metaObj['userEmail'] || metaObj['userName']) {
        return {
          displayName: metaObj['userName'] || metaObj['userEmail'],
          email: metaObj['userEmail'],
        };
      }
    }

    // If we have accountId, show that
    if (accountId) {
      return {
        id: accountId,
      };
    }

    return null;
  }, [accountId, metadata]);

  const userInfo = useMemo(() => getUserInfo(), [getUserInfo]);

  if (!logEntry) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="logs:notFound" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="logs:notFoundDescription" />
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-2.5">
      <div className="flex flex-col space-y-1">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/logs" className="text-secondary-foreground">
                  <Trans i18nKey="logs:auditLogs.title" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <Trans i18nKey="logs:auditLogDetails" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col">
          <Heading level={4}>
            <Trans i18nKey="logs:auditLogDetails" />
          </Heading>

          <Heading level={6} className="text-muted-foreground text-sm">
            <Trans i18nKey="logs:auditLogDetailsDescription" values={{ id }} />
          </Heading>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className={operationDetails.color}>
              {operationDetails.icon}
            </span>

            <CardTitle>
              {operation.toUpperCase()} - {schemaName}.{tableName}
            </CardTitle>
          </div>

          <div>
            <div className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="text-muted-foreground h-4 w-4" />

                  <span className="font-medium">
                    <Trans i18nKey="logs:performedBy" />:
                  </span>

                  {userInfo ? (
                    <div className="text-muted-foreground flex items-center gap-2">
                      {user?.email ? (
                        <>
                          <span>{user.email}</span>
                        </>
                      ) : (
                        <If condition={userInfo?.id}>
                          {(userId) => (
                            <CopyToClipboard
                              value={userId}
                              className="font-mono text-xs"
                            >
                              {userId}
                            </CopyToClipboard>
                          )}
                        </If>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">
                      <Trans i18nKey="logs:system" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-muted-foreground h-4 w-4" />

                  <span className="font-medium">
                    <Trans i18nKey="logs:timestamp" />:
                  </span>

                  <span className={'text-muted-foreground'}>
                    {dateFormatter(new Date(createdAt), 'PPpp')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="text-muted-foreground h-4 w-4" />

                  <span className="font-medium">
                    <Trans i18nKey="logs:severity" />:
                  </span>

                  <span className="uppercase">
                    <SeverityBadge severity={severity} />
                  </span>
                </div>

                {recordId && (
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="text-muted-foreground h-4 w-4" />

                    <span className="font-medium">
                      <Trans i18nKey="logs:recordId" />:
                    </span>

                    <span className="text-muted-foreground font-mono text-xs">
                      <CopyToClipboard value={recordId}>
                        {recordId}
                      </CopyToClipboard>
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {metadata &&
                  typeof metadata === 'object' &&
                  Object.keys(metadata).length > 0 &&
                  Object.keys(metadata).filter(
                    (key) => !['userEmail', 'userName'].includes(key),
                  ).length > 0 && (
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <TableIcon className="text-muted-foreground h-4 w-4" />

                        <span className="font-medium">
                          <Trans i18nKey="auditLogs:additionalMetadata" />:
                        </span>
                      </div>

                      <div className="pl-6 text-xs">
                        {Object.entries(metadata as Record<string, unknown>)
                          .filter(
                            ([key]) => !['userEmail', 'userName'].includes(key),
                          )
                          .map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="font-medium">{key}:</span>

                              <span className="font-mono">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="diff" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="diff">
                <Trans i18nKey="logs:diff" />
              </TabsTrigger>

              <TabsTrigger value="old">
                <Trans i18nKey="logs:oldData" />
              </TabsTrigger>

              <TabsTrigger value="new">
                <Trans i18nKey="logs:newData" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="diff">
              {diffData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">
                        <Trans i18nKey="logs:field" />
                      </TableHead>

                      <TableHead>
                        <Trans i18nKey="logs:oldValue" />
                      </TableHead>

                      <TableHead>
                        <Trans i18nKey="logs:newValue" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {diffData.map((diff) => (
                      <TableRow
                        key={diff.key}
                        className={diff.isDifferent ? 'bg-muted/30' : ''}
                      >
                        <TableCell className="font-medium">
                          {diff.key}
                        </TableCell>

                        <TableCell
                          className={
                            diff.isDifferent
                              ? 'bg-red-50 dark:bg-red-950/20'
                              : ''
                          }
                        >
                          {formatValue(diff.oldValue)}
                        </TableCell>

                        <TableCell
                          className={
                            diff.isDifferent
                              ? 'bg-green-50 dark:bg-green-950/20'
                              : ''
                          }
                        >
                          {formatValue(diff.newValue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  <Trans i18nKey="logs:noDataChanges" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="old">
              <ScrollArea className="h-[400px]">
                {oldData ? (
                  <CodeBlock lang="json">
                    {JSON.stringify(oldData, null, 2)}
                  </CodeBlock>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Trans i18nKey="logs:noOldData" />
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="new">
              <ScrollArea className="h-[400px]">
                {newData ? (
                  <CodeBlock lang="json">
                    {JSON.stringify(newData, null, 2)}
                  </CodeBlock>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Trans i18nKey="logs:noNewData" />
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-muted-foreground text-xs">
            <Trans i18nKey="logs:logId" values={{ id }} />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
