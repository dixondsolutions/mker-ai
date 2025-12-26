import { useCallback, useMemo, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
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

import {
  WidgetTypeConfig,
  getWidgetTypeConfig,
} from '../../lib/widget-registry';
import type { DashboardWidget, WidgetType } from '../../types';
import { WidgetFormData, getWidgetFormSchema } from '../../types/widget-forms';
import {
  ConfigField,
  QueryConfigField as QueryConfigFieldComponent,
} from './widget-config-panel-helpers';

interface WidgetConfigPanelProps {
  widget?: DashboardWidget;
  widgetType: WidgetType;
  dashboardId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: unknown) => void;
}

type TabType = 'basic' | 'display' | 'query';

interface PanelTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function PanelTabNavigation({
  activeTab,
  onTabChange,
}: PanelTabNavigationProps) {
  const tabs: TabType[] = ['basic', 'display', 'query'];

  return (
    <div className="flex space-x-1 border-b">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
            activeTab === tab
              ? 'border-primary text-primary border-b-2'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trans i18nKey={`dashboard:widgetConfig.advancedPanel.tabs.${tab}`} />
        </button>
      ))}
    </div>
  );
}

function PanelTitleField() {
  return (
    <FormField
      name="title"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.widgetTitle" />
          </FormLabel>

          <FormControl>
            <Input {...field} />
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:messages.descriptiveTitle" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PanelSchemaField() {
  return (
    <FormField
      name="schemaName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.schema" />
          </FormLabel>

          <FormControl>
            <Input {...field} />
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:messages.databaseSchemaName" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PanelTableField() {
  return (
    <FormField
      name="tableName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <Trans i18nKey="dashboard:labels.table" />
          </FormLabel>

          <FormControl>
            <Input {...field} />
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:messages.databaseTableName" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PanelBasicConfiguration() {
  return (
    <div className="space-y-4">
      <PanelTitleField />

      <div className="grid grid-cols-2 gap-4">
        <PanelSchemaField />
        <PanelTableField />
      </div>
    </div>
  );
}

interface PanelDisplayConfigurationProps {
  widgetTypeConfig: WidgetTypeConfig;
  widgetType: WidgetType;
}

function PanelDisplayConfiguration({
  widgetTypeConfig,
  widgetType,
}: PanelDisplayConfigurationProps) {
  return (
    <div className="space-y-4">
      {widgetTypeConfig.configFields.map((field) => (
        <ConfigField key={field.key} field={field} widgetType={widgetType} />
      ))}
    </div>
  );
}

interface PanelQueryConfigurationProps {
  widgetTypeConfig: WidgetTypeConfig;
  widgetType: WidgetType;
}

function PanelQueryConfiguration({
  widgetTypeConfig,
  widgetType,
}: PanelQueryConfigurationProps) {
  return (
    <div className="space-y-4">
      {widgetTypeConfig.configFields
        .filter((f) => f.category === 'data')
        .map((field) => (
          <QueryConfigFieldComponent
            key={field.key}
            field={field as never}
            widgetType={widgetType}
          />
        ))}
    </div>
  );
}

function useWidgetConfigForm(
  widget?: DashboardWidget,
  widgetType?: WidgetType,
) {
  const { t } = useTranslation();
  const formSchema = getWidgetFormSchema(widgetType!);

  const defaultValues = useMemo(() => {
    const widgetTypeConfig = getWidgetTypeConfig(widgetType!);

    return {
      title:
        widget?.title ||
        t('dashboard:widgets.configPanel.placeholders.newWidget', {
          widgetType,
        }),
      description: '',
      type: widgetType!,
      schemaName: widget?.schema_name || 'public',
      tableName: widget?.table_name || '',
      ...(widgetTypeConfig && {
        config:
          typeof widget?.config === 'string'
            ? JSON.parse(widget.config)
            : widget?.config || {},
      }),
    };
  }, [widget, widgetType, t]);

  return useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
}

export function WidgetConfigPanel({
  widget,
  widgetType,
  dashboardId,
  isOpen,
  onClose,
  onSave,
}: WidgetConfigPanelProps) {
  const fetcher = useFetcher();
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  const widgetTypeConfig = getWidgetTypeConfig(widgetType);
  const isEditing = !!widget;
  const form = useWidgetConfigForm(widget, widgetType);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  if (!widgetTypeConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} key={widget?.id || 'new'}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <Trans i18nKey="dashboard:messages.editWidget" />
            ) : (
              <Trans i18nKey="dashboard:messages.configureWidget" />
            )}
          </DialogTitle>

          <DialogDescription>
            <Trans
              i18nKey="dashboard:messages.configureWidgetSettings"
              values={{ widgetType: widgetTypeConfig.name.toLowerCase() }}
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              const typedData = data as unknown as WidgetFormData;
              const payload = {
                widgetType,
                title: typedData.title,
                schemaName: typedData.schemaName,
                tableName: typedData.tableName,
                config: typedData.config,
              };

              const action = isEditing
                ? `/dashboards/${dashboardId}/widgets/${widget!.id}`
                : `/dashboards/${dashboardId}/widgets`;

              fetcher.submit(JSON.stringify(payload), {
                method: isEditing ? 'PUT' : 'POST',
                action,
                encType: 'application/json',
              });

              onSave(typedData);
              onClose();
            })}
            className="space-y-6"
          >
            <PanelTabNavigation
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />

            {activeTab === 'basic' && <PanelBasicConfiguration />}

            {activeTab === 'display' && widgetTypeConfig ? (
              <PanelDisplayConfiguration
                widgetTypeConfig={widgetTypeConfig}
                widgetType={widgetType}
              />
            ) : null}

            {activeTab === 'query' && widgetTypeConfig ? (
              <PanelQueryConfiguration
                widgetTypeConfig={widgetTypeConfig}
                widgetType={widgetType}
              />
            ) : null}

            <PanelActionButtons
              isSubmitting={fetcher.state === 'submitting'}
              isEditing={isEditing}
              onClose={onClose}
            />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PanelActionButtons({
  isSubmitting,
  isEditing,
  onClose,
}: {
  isSubmitting: boolean;
  isEditing: boolean;
  onClose: () => void;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>
        <Trans i18nKey="dashboard:actions.cancel" />
      </Button>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <Trans i18nKey="dashboard:actions.saving" />
        ) : isEditing ? (
          <Trans i18nKey="dashboard:actions.updateWidget" />
        ) : (
          <Trans i18nKey="dashboard:actions.createWidget" />
        )}
      </Button>
    </DialogFooter>
  );
}
