import { zodResolver } from '@hookform/resolvers/zod';
import {
  BarChart3Icon,
  Sparkles,
  TableIcon,
  TrendingUpIcon,
} from 'lucide-react';
import { UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { WidgetType } from '../../../types';

type BasicInfoAndTypeFormData = {
  title: string;
  type?: WidgetType;
};

interface CreateWidgetStepBasicInfoAndTypeProps {
  id: string;
  data: {
    title?: string;
    type?: WidgetType;
  };
  onSubmit: (updates: BasicInfoAndTypeFormData) => void;
  onUseTemplate?: () => void;
}

const WIDGET_TYPES = [
  {
    id: 'chart',
    name: <Trans i18nKey="dashboard:wizard.widgetType.chart.name" />,
    description: (
      <Trans i18nKey="dashboard:wizard.widgetType.chart.description" />
    ),
    icon: BarChart3Icon,
  },
  {
    id: 'metric',
    name: <Trans i18nKey="dashboard:wizard.widgetType.metric.name" />,
    description: (
      <Trans i18nKey="dashboard:wizard.widgetType.metric.description" />
    ),
    icon: TrendingUpIcon,
  },
  {
    id: 'table',
    name: <Trans i18nKey="dashboard:wizard.widgetType.table.name" />,
    description: (
      <Trans i18nKey="dashboard:wizard.widgetType.table.description" />
    ),
    icon: TableIcon,
  },
] as Array<{
  id: WidgetType;
  name: React.ReactNode;
  description: React.ReactNode;
  icon: React.ElementType;
}>;

export function CreateWidgetStepBasicInfo({
  id,
  data,
  onSubmit,
  onUseTemplate,
}: CreateWidgetStepBasicInfoAndTypeProps) {
  const form = useBasicInfoForm(data);

  return (
    <div className="mx-auto w-full space-y-6">
      <Form {...form}>
        <form id={id} onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col space-y-6">
            <TitleField />

            <WidgetTypeSelection form={form} />

            {onUseTemplate && (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={onUseTemplate}
                  className="w-full max-w-md"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  <Trans i18nKey="dashboard:wizard.useTemplate" />
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

function WidgetTypeSelection({
  form,
}: {
  form: UseFormReturn<BasicInfoAndTypeFormData>;
}) {
  const selectedType = useWatch({
    control: form.control,
    name: 'type',
  });

  const handleTypeSelect = (type: WidgetType) => {
    form.setValue('type', type, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <FormLabel className="text-sm font-medium">
          <Trans i18nKey="dashboard:wizard.widgetType.title" />
        </FormLabel>

        <FormDescription className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="dashboard:wizard.widgetType.subtitle" />
        </FormDescription>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {WIDGET_TYPES.map((widgetType) => {
          const isSelected = selectedType === widgetType.id;

          return (
            <WidgetTypeCard
              key={widgetType.id}
              widgetType={widgetType}
              isSelected={isSelected}
              onSelect={() => handleTypeSelect(widgetType.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function useBasicInfoForm(data: { title?: string; type?: WidgetType }) {
  return useForm<BasicInfoAndTypeFormData>({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1),
        type: z.enum(['chart', 'metric', 'table']).optional(),
      }),
    ),
    defaultValues: {
      title: data.title || '',
      type: data.type || undefined,
    },
  });
}

function TitleField() {
  const { t } = useTranslation();

  return (
    <FormField
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.widgetName" />
          </FormLabel>

          <FormControl>
            <Input
              type="text"
              placeholder={t(
                'dashboard:wizard.basicInfo.placeholders.widgetName',
              )}
              data-testid="widget-title-input"
              {...field}
            />
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:wizard.basicInfo.nameHelper" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function WidgetTypeCard({
  widgetType,
  isSelected,
  onSelect,
}: {
  widgetType: (typeof WIDGET_TYPES)[number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = widgetType.icon;

  return (
    <Card
      className={cn('cursor-pointer transition-all duration-200', {
        'bg-muted': isSelected,
        'hover:bg-muted/50': !isSelected,
      })}
    >
      <button
        type="button"
        onClick={onSelect}
        data-testid={`widget-type-${widgetType.id}`}
      >
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <Icon className={cn('h-8 w-8')} />
          </div>

          <div className="space-y-2">
            <h4
              className={cn(
                'flex items-center justify-center gap-2 text-base font-semibold',
              )}
            >
              <Trans
                i18nKey={`dashboard:wizard.widgetType.${widgetType.id}.name`}
              />
            </h4>

            <p className="text-muted-foreground text-sm leading-relaxed">
              <Trans
                i18nKey={`dashboard:wizard.widgetType.${widgetType.id}.description`}
              />
            </p>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}
