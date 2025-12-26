import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from 'lucide-react';
import { UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { If } from '@kit/ui/if';
import { Stepper } from '@kit/ui/stepper';
import { Trans } from '@kit/ui/trans';

import { getDefaultWidgetFormData } from '../../../lib/widget-default-configs';
import { getWidgetTypeConfig } from '../../../lib/widget-registry';
import { DashboardWidget, WidgetType } from '../../../types';
import {
  FlexibleWidgetFormSchema,
  PartialWidgetFormData,
  WidgetFormStepUpdate,
} from '../../../types/widget-forms';
import { TemplatePalette } from '../template-palette';
import { CreateWidgetStepBasicInfo } from './create-widget-basic-info-step';
import { CreateWidgetStepDataConfig } from './create-widget-data-config-step';
import { CreateWidgetFilters } from './create-widget-filters-step';
import { CreateWidgetPreview } from './create-widget-preview-step';

function useWidgetWizard(
  dashboardId: string,
  initialData: PartialWidgetFormData = {},
  editingWidget?: DashboardWidget,
  onSuccess?: CreateWidgetWizardProps['onSuccess'],
) {
  const fetcher = useFetcher<{
    success?: boolean;
    data?: { id: string };
    positionAdjusted?: boolean;
    originalPosition?: { x: number; y: number; w: number; h: number };
    finalPosition?: { x: number; y: number; w: number; h: number };
  }>();

  const [currentStep, setCurrentStep] = useState(0);

  // Get the widget type from editing widget or initial data
  const widgetType =
    (editingWidget?.widget_type as WidgetType) || initialData.type;

  // Merge default configuration with provided initial data
  const defaultFormData = getDefaultWidgetFormData(widgetType);

  const mergedInitialData = {
    ...defaultFormData,
    ...initialData,
    type: widgetType,
    // Deep merge config objects, with initialData taking precedence
    config: {
      ...defaultFormData.config,
      ...initialData.config,
    },
  };

  const form = useForm({
    resolver: zodResolver(FlexibleWidgetFormSchema),
    defaultValues: mergedInitialData,
    mode: 'onSubmit',
  });

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  const handleCreate = useCallback(
    (formData: FlexibleWidgetFormData) => {
      const widgetType = formData.type || initialData.type;

      if (editingWidget) {
        // Update existing widget
        const payload = {
          widgetType: widgetType,
          title: formData.title,
          description: formData.description,
          schemaName: formData.schemaName,
          tableName: formData.tableName,
          config: formData.config,
        };

        fetcher.submit(JSON.stringify(payload), {
          method: 'PUT',
          action: `/dashboards/${dashboardId}/widgets/${editingWidget.id}`,
          encType: 'application/json',
        });
      } else {
        // Create new widget
        const widgetConfig = getWidgetTypeConfig(widgetType as WidgetType);
        const defaultSize = widgetConfig?.defaultSize || { w: 4, h: 3 };

        const position = {
          x: 0,
          y: 0,
          w: defaultSize.w,
          h: defaultSize.h,
        };

        const payload = {
          widgetType: widgetType,
          title: formData.title,
          description: formData.description,
          schemaName: formData.schemaName,
          tableName: formData.tableName,
          config: formData.config,
          position,
          dashboardId,
        };

        fetcher.submit(JSON.stringify(payload), {
          method: 'POST',
          action: `/dashboards/${dashboardId}/widgets`,
          encType: 'application/json',
        });
      }
    },
    [dashboardId, fetcher, initialData.type, editingWidget],
  );

  const resetWizard = useCallback(() => {
    setCurrentStep(0);

    form.reset();
  }, [form]);

  const isSubmitting = fetcher.state === 'submitting';

  // Handle successful widget creation
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const response = fetcher.data;

      if (response.success && response.data && onSuccess) {
        onSuccess(response.data.id, {
          positionAdjusted: response.positionAdjusted,
          originalPosition: response.originalPosition,
          finalPosition: response.finalPosition,
        });
      }
    }
  }, [fetcher.state, fetcher.data, onSuccess]);

  return useMemo(
    () => ({
      currentStep,
      form,
      isSubmitting,
      handleNext,
      handlePrevious,
      handleCreate,
      resetWizard,
    }),
    [
      currentStep,
      form,
      isSubmitting,
      handleNext,
      handlePrevious,
      handleCreate,
      resetWizard,
    ],
  );
}

type CreateWidgetWizardProps = {
  isOpen?: boolean;
  onClose: () => void;
  dashboardId: string;
  initialData?: PartialWidgetFormData;
  editingWidget?: DashboardWidget;
  onSuccess?: (
    widgetId: string,
    placementResult?: {
      positionAdjusted?: boolean;
      originalPosition?: { x: number; y: number; w: number; h: number };
      finalPosition?: { x: number; y: number; w: number; h: number };
    },
  ) => void;
};

const STEP_KEYS = [
  'dashboard:wizard.basicInfo.title',
  'dashboard:wizard.dataConfig.title',
  'dashboard:filters.title',
  'dashboard:wizard.preview.title',
] as const;

type FlexibleWidgetFormData = z.infer<typeof FlexibleWidgetFormSchema>;

interface WizardStepRendererProps {
  currentStep: number;
  form: UseFormReturn<FlexibleWidgetFormData>;
  onNext: () => void;
  onCreate: (formData: FlexibleWidgetFormData) => void;
  onUseTemplate?: () => void;
}

const StepsKeyMap = {
  BASIC_INFO_AND_TYPE: 0,
  DATA_CONFIG: 1,
  FILTERS: 2,
  PREVIEW: 3,
} as const;

function WizardStepRenderer({
  currentStep,
  form,
  onNext,
  onCreate,
  onUseTemplate,
}: WizardStepRendererProps) {
  const currentStepFormId = `create-widget-wizard-step-${currentStep}`;
  const formData = useWatch({ control: form.control });

  const handleStepSubmit = useCallback(
    (updates: WidgetFormStepUpdate) => {
      // Check if widget type is being changed
      const currentType = form.getValues('type');

      const newType = updates.type;
      const isTypeChanging = newType && newType !== currentType;

      Object.entries(updates).forEach(([key, value]) => {
        form.setValue(key as keyof FlexibleWidgetFormData, value, {
          shouldValidate: false, // Don't trigger validation during step transition
          shouldDirty: true,
          shouldTouch: true,
        });
      });

      if (isTypeChanging && newType) {
        // Reset config to default values for the new widget type
        const defaultConfig = getDefaultWidgetFormData(newType).config;

        form.setValue('config', defaultConfig, {
          shouldValidate: false, // Don't trigger validation during reset
          shouldDirty: true,
          shouldTouch: true,
        });
      }

      onNext();
    },
    [form, onNext],
  );

  switch (currentStep) {
    case StepsKeyMap.BASIC_INFO_AND_TYPE:
      return (
        <CreateWidgetStepBasicInfo
          id={currentStepFormId}
          data={formData as PartialWidgetFormData}
          onSubmit={handleStepSubmit}
          onUseTemplate={onUseTemplate}
        />
      );

    case StepsKeyMap.DATA_CONFIG:
      return (
        <CreateWidgetStepDataConfig
          id={currentStepFormId}
          onSubmit={handleStepSubmit}
          form={form}
        />
      );

    case StepsKeyMap.FILTERS:
      return (
        <CreateWidgetFilters
          id={currentStepFormId}
          data={formData as PartialWidgetFormData}
          onSubmit={handleStepSubmit}
        />
      );

    case StepsKeyMap.PREVIEW:
      return (
        <CreateWidgetPreview
          id={currentStepFormId}
          data={formData as PartialWidgetFormData}
          onSubmit={() => onCreate(formData as FlexibleWidgetFormData)}
        />
      );

    default:
      return null;
  }
}

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  isEditing?: boolean;
}

function WizardNavigation({
  currentStep,
  totalSteps,
  isSubmitting,
  onPrevious,
  isEditing = false,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === StepsKeyMap.BASIC_INFO_AND_TYPE;
  const isLastStep = currentStep === totalSteps - 1;
  const currentStepFormId = `create-widget-wizard-step-${currentStep}`;

  return (
    <DialogFooter className="px-4">
      <If condition={!isFirstStep}>
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          data-testid="wizard-previous-button"
        >
          <Trans i18nKey={'common:previous'} />
        </Button>
      </If>

      <If condition={isFirstStep}>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            data-testid="widget-cancel-button"
          >
            <Trans i18nKey={'common:cancel'} />
          </Button>
        </DialogClose>
      </If>

      <Button
        form={currentStepFormId}
        disabled={isSubmitting}
        data-testid={isLastStep ? 'widget-save-button' : 'wizard-next-button'}
      >
        <Trans
          i18nKey={
            isLastStep
              ? isEditing
                ? 'dashboard:actions.updateWidget'
                : 'dashboard:actions.createWidget'
              : 'common:next'
          }
        />
      </Button>
    </DialogFooter>
  );
}

export function CreateWidgetWizard({
  isOpen,
  onClose,
  dashboardId,
  children,
  initialData = {
    type: 'chart',
  },
  editingWidget,
  onSuccess,
}: React.PropsWithChildren<CreateWidgetWizardProps>) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent
        className="flex max-h-[90vh] w-full min-w-4xl flex-1 flex-col overflow-y-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        data-testid="widget-wizard-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey={
                editingWidget
                  ? 'dashboard:wizard.editWidget'
                  : 'dashboard:wizard.createWidget'
              }
            />
          </DialogTitle>

          <DialogDescription>
            <Trans
              i18nKey={
                editingWidget
                  ? 'dashboard:wizard.editWidgetDescription'
                  : 'dashboard:wizard.createWidgetDescription'
              }
            />
          </DialogDescription>
        </DialogHeader>

        <CreateWidgetWizardContent
          dashboardId={dashboardId}
          initialData={initialData}
          editingWidget={editingWidget}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateWidgetWizardContentProps {
  dashboardId: string;
  initialData: PartialWidgetFormData;
  editingWidget?: DashboardWidget;
  onSuccess?: CreateWidgetWizardProps['onSuccess'];
}

function CreateWidgetWizardContent({
  dashboardId,
  initialData,
  editingWidget,
  onSuccess,
}: CreateWidgetWizardContentProps) {
  const { t } = useTranslation();
  const [showTemplates, setShowTemplates] = useState(false);

  const {
    currentStep,
    form,
    isSubmitting,
    handleNext,
    handlePrevious,
    handleCreate,
  } = useWidgetWizard(dashboardId, initialData, editingWidget, onSuccess);

  const handleCreateAndClose = useCallback(
    (formData: FlexibleWidgetFormData) => {
      handleCreate(formData);
    },
    [handleCreate],
  );

  const stepComponents = useMemo(() => STEP_KEYS.map((key) => t(key)), [t]);

  // Show template palette if user clicked "Use a template instead"
  if (showTemplates) {
    return (
      <div className="flex min-h-[500px] w-full flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(false)}
          >
            <ArrowLeftIcon className="mr-2 h-3 w-3" />
            <Trans i18nKey="common:back" defaults="Back to Wizard" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TemplatePalette
            onTemplateApplied={() => {
              // Template was applied successfully, just close by calling onSuccess with dummy values
              // The parent dialog will handle closing
              if (onSuccess) {
                onSuccess('template-applied');
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full flex-1 flex-col space-y-10 overflow-y-hidden">
        <Stepper
          steps={stepComponents}
          currentStep={currentStep}
          variant="default"
        />

        <div className="flex w-full flex-1 flex-col overflow-y-hidden border-t pt-4">
          <div className="flex min-h-64 w-full flex-1 overflow-y-auto p-0.5 pb-8">
            <WizardStepRenderer
              currentStep={currentStep}
              form={form}
              onNext={handleNext}
              onCreate={handleCreateAndClose}
              onUseTemplate={() => setShowTemplates(true)}
            />
          </div>
        </div>
      </div>

      <DialogFooter className="h-12 border-t pt-4">
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={STEP_KEYS.length}
          isSubmitting={isSubmitting}
          onPrevious={handlePrevious}
          isEditing={!!editingWidget}
        />
      </DialogFooter>
    </>
  );
}
