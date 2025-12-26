import { useParams } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, XIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ColumnMetadata, RelationConfig } from '@kit/types';
import { Button } from '@kit/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Form } from '@kit/ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { TooltipProvider } from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { createFieldSchema } from '../../utils/create-field-schema';
import { getFieldPlaceholder } from '../../utils/field-placeholder';
import { useFormBlocker } from './hooks/use-form-blocker';
import { RecordFormControl } from './record-form-control';

type Relation = {
  column: string;
  original: unknown;
  formatted: string | null | undefined;
  link: string | null | undefined;
};

export function FormFieldInlineEditor({
  column,
  value,
  relation,
  relationConfig,
  displayButtonLabels = true,
  isSubmitting = false,
  className = '',
  onCancel,
  onSubmit,
}: {
  column: ColumnMetadata;
  value: unknown;
  onCancel: () => unknown;
  onSubmit: (data: { [key: string]: unknown }) => unknown;
  isSubmitting: boolean;
  relation?: Relation;
  relationConfig?: RelationConfig;
  displayButtonLabels?: boolean;
  className?: string;
}) {
  const isEditable = column.is_editable ?? true;
  const { schema, table } = useParams();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        value: createFieldSchema(column, !!relationConfig),
      }),
    ),
    defaultValues: {
      value,
    },
    disabled: !isEditable,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const hasUnsavedChanges = form.formState.isDirty;

  useFormBlocker({
    hasUnsavedChanges,
    isSubmitting,
  });

  return (
    <Form {...form}>
      <form
        data-testid="inline-editor-form"
        data-test-column={column.name}
        onSubmit={form.handleSubmit(async (data) => {
          if (!form.formState.isDirty || isSubmitting) {
            return onCancel();
          }

          return onSubmit({
            [column.name]: data.value,
          });
        })}
      >
        <div className="flex flex-col space-y-2">
          <FormField
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="hidden text-xs font-normal">
                  <span>{column.display_name || column.name}</span>

                  {column.is_required ? (
                    <span className="text-muted-foreground text-xs">*</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      <Trans i18nKey="dataExplorer:optional" />
                    </span>
                  )}
                </FormLabel>

                <div
                  className={cn(
                    'flex w-full items-center justify-between gap-x-1.5',
                    className,
                  )}
                  data-testid="inline-editor-container"
                  data-test-column={column.name}
                >
                  <FormControl className="w-full flex-1">
                    <RecordFormControl
                      field={column}
                      formField={field}
                      relation={relation}
                      relationConfig={relationConfig}
                      placeholder={getFieldPlaceholder(column)}
                      allowCreateRelation={true}
                      schema={schema}
                      table={table}
                    />
                  </FormControl>

                  <div className="flex items-center gap-x-0.5">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip disableHoverableContent={displayButtonLabels}>
                        <TooltipTrigger asChild>
                          <Button
                            size={displayButtonLabels ? 'sm' : 'icon'}
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            data-testid={`inline-editor-cancel`}
                            data-test-column={column.name}
                          >
                            <XIcon className="h-4 w-4" />

                            {displayButtonLabels && (
                              <span className="ml-1">
                                <Trans i18nKey="common:cancel" />
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>
                          <Trans i18nKey="common:cancel" />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={0}>
                      <Tooltip disableHoverableContent={displayButtonLabels}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size={displayButtonLabels ? 'sm' : 'icon'}
                            disabled={!form.formState.isDirty || isSubmitting}
                            data-testid={`inline-editor-save`}
                            data-test-column={column.name}
                          >
                            <CheckIcon className="h-4 w-4" />

                            {displayButtonLabels && (
                              <span className="ml-1">
                                <Trans i18nKey="common:save" />
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>
                          <Trans i18nKey="common:save" />
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <FormMessage role="alert" />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
