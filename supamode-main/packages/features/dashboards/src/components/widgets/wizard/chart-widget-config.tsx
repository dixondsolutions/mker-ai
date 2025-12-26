import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

export const ChartConfigSchema = z.object({
  chartType: z.enum(['bar', 'line', 'area', 'pie']).default('bar'),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  curveType: z.enum(['linear', 'monotone', 'step']).default('monotone'),
  fillArea: z.boolean().default(true),
  stackedBars: z.boolean().default(false),
  showLegend: z.boolean().default(true),
  showGridLines: z.boolean().default(true),
  showDataLabels: z.boolean().default(false),
  enableZoom: z.boolean().default(false),
  enableAnimation: z.boolean().default(true),
});

type ChartWidgetConfigProps = {
  config: z.infer<typeof ChartConfigSchema>;
};

export function ChartWidgetConfig({ config }: ChartWidgetConfigProps) {
  const { t } = useTranslation();

  const form = useForm({
    resolver: zodResolver(ChartConfigSchema),
    defaultValues: {
      chartType: config['chartType'] || 'bar',
      xAxisLabel: config['xAxisLabel'] || '',
      yAxisLabel: config['yAxisLabel'] || '',
      curveType: config['curveType'] || 'monotone',
      fillArea: config['fillArea'] !== false,
      stackedBars: config['stackedBars'] || false,
      showLegend: config['showLegend'] !== false,
      showGridLines: config['showGridLines'] !== false,
      showDataLabels: config['showDataLabels'] || false,
      enableZoom: config['enableZoom'] || false,
      enableAnimation: config['enableAnimation'] !== false,
    },
  });

  const data = useWatch({ control: form.control });

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-medium">
            <Trans i18nKey="dashboard:widgetConfig.appearance" />
          </h4>

          <div className="space-y-4">
            <FormField
              name="chartType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="dashboard:widgetConfig.chart.chartType" />
                  </FormLabel>

                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>

                    <SelectContent>
                      <SelectItem value="bar">
                        <Trans i18nKey="dashboard:widgetPalette.widgets.barChart.name" />
                      </SelectItem>

                      <SelectItem value="line">
                        <Trans i18nKey="dashboard:widgetPalette.widgets.lineChart.name" />
                      </SelectItem>

                      <SelectItem value="area">
                        <Trans i18nKey="dashboard:widgetPalette.widgets.areaChart.name" />
                      </SelectItem>

                      <SelectItem value="pie">
                        <Trans i18nKey="dashboard:widgetPalette.widgets.pieChart.name" />
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Axis Labels */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="xAxisLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="dashboard:widgetConfig.chart.xAxisLabel" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          'dashboard:widgetConfig.chart.xAxisLabelPlaceholder',
                        )}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                name="yAxisLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="dashboard:widgetConfig.chart.yAxisLabel" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t(
                          'dashboard:widgetConfig.chart.yAxisLabelPlaceholder',
                        )}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Line Chart Specific Options */}
            {(data.chartType === 'line' || data.chartType === 'area') && (
              <FormField
                name="curveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="dashboard:widgetConfig.chart.curveType" />
                    </FormLabel>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value="linear">
                          <Trans i18nKey="dashboard:widgetConfig.chart.curveLinear" />
                        </SelectItem>

                        <SelectItem value="monotone">
                          <Trans i18nKey="dashboard:widgetConfig.chart.curveSmooth" />
                        </SelectItem>

                        <SelectItem value="step">
                          <Trans i18nKey="dashboard:widgetConfig.chart.curveStep" />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {/* Area Chart Specific */}
            {data.chartType === 'area' && (
              <FormField
                name="fillArea"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>

                    <FormLabel>
                      <Trans i18nKey="dashboard:widgetConfig.chart.fillArea" />
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {/* Bar Chart Specific */}
            {data.chartType === 'bar' && (
              <FormField
                name="stackedBars"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>

                    <FormLabel>
                      <Trans i18nKey="dashboard:widgetConfig.chart.stackedBars" />
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-3 text-sm font-medium">
            <Trans i18nKey="dashboard:widgetConfig.behavior" />
          </h4>

          <div className="space-y-4">
            {/* Show Legend */}
            <FormField
              name="showLegend"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>
                    <Trans i18nKey="dashboard:labels.showLegend" />
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Show Grid Lines */}
            <FormField
              name="showGridLines"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>
                    <Trans i18nKey="dashboard:widgetConfig.chart.showGridLines" />
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Show Data Labels */}
            <FormField
              name="showDataLabels"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>
                    <Trans i18nKey="dashboard:widgetConfig.chart.showDataLabels" />
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Enable Zoom */}
            <FormField
              name="enableZoom"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>
                    <Trans i18nKey="dashboard:widgetConfig.chart.enableZoom" />
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Enable Animation */}
            <FormField
              name="enableAnimation"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>

                  <FormLabel>
                    <Trans i18nKey="dashboard:widgetConfig.chart.enableAnimation" />
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </Form>
  );
}
