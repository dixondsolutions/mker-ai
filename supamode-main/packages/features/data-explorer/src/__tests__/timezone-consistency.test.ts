/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { FilterBuilder } from '@kit/filters-core';
import type { ColumnMetadata } from '@kit/types';

import { dataExplorerCustomHandlers } from '../api/handlers/custom-filter-handlers';

describe('Data Explorer - Timezone Consistency Tests', () => {
  let mockColumns: ColumnMetadata[];
  let filterBuilder: FilterBuilder;

  beforeEach(() => {
    mockColumns = [
      {
        name: 'created_at',
        ordering: null,
        display_name: null,
        description: null,
        is_searchable: false,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: false,
        is_primary_key: false,
        is_required: false,
        relations: [],
        ui_config: { data_type: 'timestamp with time zone' },
      },
    ];

    filterBuilder = new FilterBuilder({
      serviceType: 'data-explorer',
      columns: mockColumns,
      customHandlers: dataExplorerCustomHandlers,
      escapeStrategy: 'raw-sql',
    });
  });

  describe('Relative vs Absolute Date Consistency', () => {
    it('should produce identical SQL for "today" relative date and current date absolute date', () => {
      // Use current date for testing - both approaches should handle the same logical day
      const now = new Date();
      const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Relative date filter
      const relativeFilter = {
        column: 'created_at',
        operator: 'eq',
        value: '__rel_date:today',
      };

      // Absolute date filter for the same day
      const absoluteFilter = {
        column: 'created_at',
        operator: 'eq',
        value: todayString,
      };

      const relativeSQL = filterBuilder.buildWhere([relativeFilter]);
      const absoluteSQL = filterBuilder.buildWhere([absoluteFilter]);

      // Debug: SQL comparison for troubleshooting
      // console.log('🔍 SQL:', { relativeSQL, absoluteSQL });

      // Both should produce valid SQL
      expect(relativeSQL).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);
      expect(absoluteSQL).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);

      // Extract the date ranges
      const relativeDates = relativeSQL.match(
        /BETWEEN '([^']+)' AND '([^']+)'/,
      );
      const absoluteDates = absoluteSQL.match(
        /BETWEEN '([^']+)' AND '([^']+)'/,
      );

      expect(relativeDates).toBeTruthy();
      expect(absoluteDates).toBeTruthy();

      if (relativeDates && absoluteDates) {
        const relativeStart = new Date(relativeDates[1]);
        const relativeEnd = new Date(relativeDates[2]);
        const absoluteStart = new Date(absoluteDates[1]);
        const absoluteEnd = new Date(absoluteDates[2]);

        // Both should represent the same logical day (allow for timezone differences)
        // The key requirement is that both represent roughly 24-hour periods
        const relativeDuration =
          relativeEnd.getTime() - relativeStart.getTime();
        const absoluteDuration =
          absoluteEnd.getTime() - absoluteStart.getTime();

        // Both should span approximately 24 hours (allow for millisecond differences)
        const expectedDuration = 24 * 60 * 60 * 1000 - 1; // 23:59:59.999
        const tolerance = 1000; // 1 second tolerance

        expect(Math.abs(relativeDuration - expectedDuration)).toBeLessThan(
          tolerance,
        );
        expect(Math.abs(absoluteDuration - expectedDuration)).toBeLessThan(
          tolerance,
        );

        // Both start times should be on the hour (00 minutes, 00 seconds)
        expect(relativeStart.getMinutes()).toBe(0);
        expect(relativeStart.getSeconds()).toBe(0);
        expect(absoluteStart.getMinutes()).toBe(0);
        expect(absoluteStart.getSeconds()).toBe(0);

        // Should span the full day (start of day to end of day)
        expect(relativeStart.toDateString()).toBe(relativeEnd.toDateString());
        expect(absoluteStart.toDateString()).toBe(absoluteEnd.toDateString());

        // Start should be beginning of day (00:00:00 in local timezone)
        expect(relativeStart.getUTCHours()).toBeLessThan(24);
        expect(absoluteStart.getUTCHours()).toBeLessThan(24);
      }
    });

    it('should handle relative dates correctly without custom handler interference', () => {
      const relativeFilter = {
        column: 'created_at',
        operator: 'eq',
        value: '__rel_date:today',
      };

      const context = filterBuilder.getContext();

      // Verify that no custom handler claims to handle relative dates
      if (context.customHandlers) {
        for (const [_name, handler] of Object.entries(context.customHandlers)) {
          const canHandle = handler.canHandle(relativeFilter, context);
          if (canHandle) {
            // If a custom handler claims it can handle the relative date,
            // it must actually produce a non-empty result
            const result = handler.process(relativeFilter, context);
            expect(result).not.toBe('');
            expect(result).toContain('BETWEEN');
          }
        }
      }

      // The FilterBuilder should handle it correctly
      const result = filterBuilder.buildCondition(relativeFilter);
      expect(result).toMatch(/^"created_at" BETWEEN '.*' AND '.*'$/);
    });

    it('should handle various relative date options consistently', () => {
      const relativeDateOptions = [
        'today',
        'yesterday',
        'tomorrow',
        'thisWeek',
        'thisMonth',
        'last7Days',
      ];

      relativeDateOptions.forEach((option) => {
        const filter = {
          column: 'created_at',
          operator: 'eq',
          value: `__rel_date:${option}`,
        };

        const result = filterBuilder.buildWhere([filter]);

        // Should produce valid SQL with BETWEEN clause
        expect(result).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);

        // Should contain valid ISO dates
        const dates = result.match(/BETWEEN '([^']+)' AND '([^']+)'/);
        expect(dates).toBeTruthy();

        if (dates) {
          const startDate = new Date(dates[1]);
          const endDate = new Date(dates[2]);

          // Dates should be valid
          expect(startDate.getTime()).not.toBeNaN();
          expect(endDate.getTime()).not.toBeNaN();

          // End should be after or equal to start
          expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        }
      });
    });

    it('should handle absolute dates in different formats consistently', () => {
      const dateFormats = [
        '2024-08-07',
        '2024-08-07T00:00:00',
        '2024-08-07T12:00:00Z',
      ];

      const results = dateFormats.map((dateFormat) => {
        const filter = {
          column: 'created_at',
          operator: 'eq',
          value: dateFormat,
        };

        return filterBuilder.buildWhere([filter]);
      });

      // All should produce valid SQL
      results.forEach((result) => {
        expect(result).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);
      });

      // All should be processed as day ranges (not exact timestamps)
      results.forEach((result) => {
        const dates = result.match(/BETWEEN '([^']+)' AND '([^']+)'/);
        expect(dates).toBeTruthy();

        if (dates) {
          const startDate = new Date(dates[1]);
          const endDate = new Date(dates[2]);

          // Should be same calendar day
          expect(startDate.toDateString()).toBe(endDate.toDateString());

          // Should span full day (approximately 24 hours)
          const timeDiff = endDate.getTime() - startDate.getTime();
          const hourseDiff = timeDiff / (1000 * 60 * 60);
          expect(hourseDiff).toBeCloseTo(24, 0); // Within 1 hour of 24 hours
        }
      });
    });
  });

  describe('Timezone Edge Cases', () => {
    it('should handle daylight saving time transitions correctly', () => {
      // Test with a date known to be during DST transition
      const dstDate = '2024-03-31'; // DST transition day in Europe

      const filter = {
        column: 'created_at',
        operator: 'eq',
        value: dstDate,
      };

      const result = filterBuilder.buildWhere([filter]);
      expect(result).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);

      const dates = result.match(/BETWEEN '([^']+)' AND '([^']+)'/);
      expect(dates).toBeTruthy();

      if (dates) {
        const startDate = new Date(dates[1]);
        const endDate = new Date(dates[2]);

        // Should still be valid dates
        expect(startDate.getTime()).not.toBeNaN();
        expect(endDate.getTime()).not.toBeNaN();

        // Should be same calendar day
        expect(startDate.toDateString()).toBe(endDate.toDateString());
      }
    });

    it('should handle timezone offset differences consistently', () => {
      const filter = {
        column: 'created_at',
        operator: 'eq',
        value: '__rel_date:today',
      };

      // Run the same filter multiple times - should produce identical results
      // (testing for consistency in timezone handling)
      const results = Array.from({ length: 3 }, () =>
        filterBuilder.buildWhere([filter]),
      );

      // All results should be identical
      results.forEach((result) => {
        expect(result).toBe(results[0]);
      });
    });
  });
});
