import { useCallback, useRef, useState } from 'react';

import { useFetcher } from 'react-router';

import { useQuery } from '@tanstack/react-query';
import { FormState } from 'react-hook-form';

import { getLookupRelations } from '@kit/data-explorer-core/utils';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { GlobalLoader } from '@kit/ui/global-loader';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { tableMetadataLoader } from '../../api/loaders/table-structure-loader';
import { useScrollableDivShadow } from '../../utils/use-scrollable-div-shadow';
import { RecordForm } from './record-form';

/**
 * @name CreateRecordDialog
 * A quick dialog to create a new record.
 *
 * @param schema - The schema of the table to create the record in.
 * @param table - The table to create the record in.
 * @param children - The children to render inside the dialog.
 * @param onCreate - A callback to call when the record is created.
 *
 * @returns
 */
export function CreateRecordDialog({
  schema,
  table,
  children,
  onCreate,
}: {
  schema: string;
  table: string;
  children: React.ReactNode;
  onCreate: (data: Record<string, unknown>) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  if (fetcher.data) {
    setOpen(false);
    onCreate(fetcher.data);
  }

  const onChange = useCallback(
    (
      _: Record<string, unknown>,
      formState: FormState<Record<string, unknown>>,
    ) => {
      setDirty(Object.keys(formState.dirtyFields).length > 0);
    },
    [],
  );

  const { className } = useScrollableDivShadow(scrollableDivRef);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        data-testid="record-dialog"
        data-dialog-type="create"
        onInteractOutside={(e) => {
          if (isSubmitting || dirty) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting || dirty) {
            e.preventDefault();
          }
        }}
        className="animate-in fade-in zoom-in slide-in-from-right-32 fixed right-0 flex h-screen max-w-3xl translate-x-0 flex-col !rounded-none px-4"
        style={{
          left: 'unset',
        }}
      >
        <DialogHeader
          className={cn('h-10 max-h-10 border-b px-2 pb-2', className)}
        >
          <DialogTitle>
            <Trans i18nKey="dataExplorer:record.createRecord" />
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col justify-start overflow-y-auto">
          <CreateRecordDialogForm
            schema={schema}
            table={table}
            setOpen={setOpen}
            isSubmitting={isSubmitting}
            ref={scrollableDivRef}
            onChange={onChange}
            onSubmit={(data) => {
              return fetcher.submit(
                JSON.stringify({
                  intent: 'create-record',
                  payload: data,
                }),
                {
                  method: 'POST',
                  encType: 'application/json',
                  action: `.`,
                },
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateRecordDialogForm({
  schema,
  table,
  setOpen,
  isSubmitting,
  onSubmit,
  onChange,
  ref,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  schema: string;
  table: string;
  setOpen: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onChange?: (
    data: Record<string, unknown>,
    formState: FormState<Record<string, unknown>>,
  ) => void;
}) {
  const {
    data: metadata,
    isLoading,
    error,
  } = useFetchMetadata({
    schema,
    table,
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          <Trans i18nKey="common:error" />
        </AlertTitle>

        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col space-y-4 overflow-y-auto" ref={ref}>
        <If condition={isLoading}>
          <GlobalLoader fullPage={false} />
        </If>

        <If condition={metadata}>
          {(metadata) => (
            <div className="flex flex-1 flex-col space-y-4">
              <RecordForm
                id="create-record-form"
                allowCreateRelation={false}
                relations={getLookupRelations(metadata.table.relationsConfig)}
                fields={metadata.columns}
                recordData={{}}
                mode="create"
                isSubmitting={isSubmitting}
                onCancel={() => {
                  setOpen(false);
                }}
                onChange={onChange}
                onSubmit={onSubmit}
              />
            </div>
          )}
        </If>
      </div>

      <If condition={!isLoading && metadata}>
        <DialogFooter className="sticky bottom-0 border-t p-4">
          <DialogClose asChild disabled={isSubmitting}>
            <Button variant="outline">
              <Trans i18nKey="common:cancel" />
            </Button>
          </DialogClose>

          <Button
            form="create-record-form"
            disabled={isSubmitting}
            data-testid="record-form-submit"
          >
            <Trans i18nKey="common:create" />
          </Button>
        </DialogFooter>
      </If>
    </>
  );
}

function useFetchMetadata(props: { schema: string; table: string }) {
  const { schema, table } = props;

  const { data, isLoading, error } = useQuery({
    queryKey: ['metadata', schema, table],
    queryFn: () => tableMetadataLoader({ schema, table }),
  });

  return { data, isLoading, error };
}
