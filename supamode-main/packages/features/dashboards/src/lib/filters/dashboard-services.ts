import { createHonoClient, handleHonoClientResponse } from '@kit/api';
import type { GetTableRoute } from '@kit/data-explorer/routes';
import type { DisplayService, TableDataLoader } from '@kit/filters';

/**
 * Dashboard Table Data Loader
 *
 * Reuses the existing data explorer API endpoints for loading table data
 * in dashboard widgets. This ensures consistency and avoids code duplication.
 */
export function createDashboardTableDataLoader(
  schemaName: string,
  tableName: string,
): TableDataLoader {
  return async (params) => {
    try {
      const client = createHonoClient<GetTableRoute>();

      const {
        page = 1,
        search = '',
        sortColumn,
        sortDirection = 'asc',
      } = params;

      const query: Partial<{
        sort_column: string;
        sort_direction: string;
        search: string;
        properties: string;
        page: string;
      }> = {};

      if (sortColumn) {
        query.sort_column = sortColumn;
      }

      if (sortDirection) {
        query.sort_direction = sortDirection;
      }

      if (search) {
        query.search = search;
      }

      if (params.properties) {
        query.properties = params.properties;
      }

      query.page = page.toString();

      const response = await client['v1']['tables'][':schema'][':table'].$get({
        param: {
          schema: schemaName,
          table: tableName,
        },
        query,
      });

      const result = await handleHonoClientResponse(response);

      return {
        data: result.data || [],
        table: {
          displayFormat: result.table?.displayFormat || undefined,
        },
      };
    } catch (error) {
      console.error('Dashboard table data loader error:', error);

      // Return empty data on error to prevent breaking the UI
      return {
        data: [],
        table: {
          displayFormat: undefined,
        },
      };
    }
  };
}

/**
 * Dashboard Display Service
 *
 * Provides display formatting for dashboard widgets.
 */
export function createDashboardDisplayService(): DisplayService {
  return {
    applyDisplayFormat: (format: string, item: Record<string, unknown>) => {
      // Apply display format template to item
      if (!format) {
        // If no format specified, try to show a meaningful value
        // Look for common display fields
        const displayFields = ['name', 'title', 'label', 'display_name'];

        for (const field of displayFields) {
          if (item[field] != null) {
            return String(item[field]);
          }
        }

        // Fallback to first non-null value
        const values = Object.values(item).filter((v) => v != null);
        return values.length > 0 ? String(values[0]) : '';
      }

      // Replace {fieldName} placeholders with actual values
      return format.replace(/{([^}]+)}/g, (_, fieldName: string) => {
        // Support fallback syntax: {field1 || field2}
        const fieldNames = fieldName.split('||').map((f) => f.trim());

        for (const field of fieldNames) {
          const value = item[field];
          if (value != null && value !== '') {
            return String(value);
          }
        }

        return ''; // No value found
      });
    },
  };
}

/**
 * Hook to create dashboard services for a specific table
 */
export function useDashboardServices(schemaName: string, tableName: string) {
  const tableDataLoader = createDashboardTableDataLoader(schemaName, tableName);
  const displayService = createDashboardDisplayService();

  return {
    tableDataLoader,
    displayService,
  };
}
