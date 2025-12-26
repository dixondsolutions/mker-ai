import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { GetWidgetPreviewDataRoute } from '../api/routes/widget-preview-route';
import type { WidgetData } from '../types';
import type { PartialWidgetFormData } from '../types/widget-forms';

/**
 * Load preview data for a widget configuration using the dedicated preview endpoint
 * This uses the same server-side logic as actual widgets, ensuring filter consistency
 */
export async function loadWidgetPreviewData(
  data: PartialWidgetFormData,
): Promise<WidgetData | null> {
  // Must have schema and table configured
  if (!data.schemaName || !data.tableName || !data.type) {
    return null;
  }

  try {
    const client = createHonoClient<GetWidgetPreviewDataRoute>();

    // Extract sorting configuration from the widget config
    const config = data.config as {
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    };

    const sorting = config?.sortBy
      ? {
          column: config.sortBy,
          direction: (config.sortDirection || 'asc') as 'asc' | 'desc',
        }
      : undefined;

    // Prepare the widget configuration for the preview endpoint
    const widgetConfig = {
      schemaName: data.schemaName,
      tableName: data.tableName,
      widgetType: data.type,
      config: data.config || {},
      ...(sorting && { sorting }),
    };

    // Make API call to the preview endpoint
    const response = await client['v1']['widgets']['preview-data'].$post({
      json: widgetConfig,
    });

    const result = await handleHonoClientResponse(response);

    return result.data;
  } catch (error) {
    console.warn('Failed to load preview data:', error);

    // Return error state instead of null so widget can show error
    return {
      data: [],
      metadata: {
        totalCount: 0,
        lastUpdated: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load preview data',
      },
    };
  }
}

/**
 * Generate preview data appropriate for the widget type
 * This can be used as a fallback when API data is not available
 */
export function generateFallbackPreviewData(
  data: PartialWidgetFormData,
): WidgetData {
  const now = new Date().toISOString();

  switch (data.type) {
    case 'chart': {
      // Generate basic chart data based on configuration
      const chartConfig = data.config as { xAxis?: string; yAxis?: string };
      const xKey = chartConfig?.xAxis || 'category';
      const yKey = chartConfig?.yAxis || 'value';

      const chartData = [
        { [xKey]: 'Jan', [yKey]: 120 },
        { [xKey]: 'Feb', [yKey]: 150 },
        { [xKey]: 'Mar', [yKey]: 180 },
        { [xKey]: 'Apr', [yKey]: 90 },
        { [xKey]: 'May', [yKey]: 200 },
        { [xKey]: 'Jun', [yKey]: 220 },
      ];

      return {
        data: chartData,
        metadata: {
          totalCount: chartData.length,
          lastUpdated: now,
          isPreview: true,
        },
      };
    }

    case 'metric': {
      return {
        data: [{ value: 1234, trend: 'up', trendPercentage: 12.5 }],
        metadata: {
          totalCount: 1,
          lastUpdated: now,
          isPreview: true,
        },
      };
    }

    case 'table': {
      const tableData = [
        {
          id: 1,
          name: 'Sample Record 1',
          status: 'active',
          created_at: '2024-01-15T10:30:00Z',
          value: 100,
        },
        {
          id: 2,
          name: 'Sample Record 2',
          status: 'inactive',
          created_at: '2024-01-20T14:22:00Z',
          value: 200,
        },
        {
          id: 3,
          name: 'Sample Record 3',
          status: 'pending',
          created_at: '2024-02-01T09:15:00Z',
          value: 150,
        },
      ];

      return {
        data: tableData,
        metadata: {
          totalCount: tableData.length,
          lastUpdated: now,
          isPreview: true,
        },
      };
    }

    default:
      return {
        data: [],
        metadata: {
          totalCount: 0,
          lastUpdated: now,
          isPreview: true,
        },
      };
  }
}
