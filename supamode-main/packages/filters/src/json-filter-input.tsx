import { useCallback, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { cn } from '@kit/ui/utils';

import { FilterItem, FilterOperator, FilterValue } from './types';

// JSON Filter state interface
interface JsonFilterState {
  operator: FilterOperator;
  simpleSearch: string;
  jsonKey: string;
  jsonValue: string;
  jsonPath: string;
  validationError: string | null;
}

// Mode selector component
function ModeSelector({
  mode,
  updateState,
}: {
  mode: 'simple' | 'keyValue' | 'path';
  updateState: (updates: Partial<JsonFilterState>) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      <Select
        value={mode}
        onValueChange={(newMode: 'simple' | 'keyValue' | 'path') => {
          const newOperator =
            newMode === 'keyValue'
              ? 'keyEquals'
              : newMode === 'path'
                ? 'pathExists'
                : 'containsText';

          // Clear state for new mode and update operator
          updateState({
            operator: newOperator,
            simpleSearch: '',
            jsonKey: '',
            jsonValue: '',
            jsonPath: '',
            validationError: null,
          });
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            <SelectLabel>
              {t('dataExplorer:filters.jsonModes.simple', {
                defaultValue: 'Simple',
              })}
            </SelectLabel>

            <SelectItem value="simple" className="text-xs">
              {t('dataExplorer:filters.jsonModes.simple', {
                defaultValue: 'Text Search',
              })}
            </SelectItem>
          </SelectGroup>

          <SelectGroup>
            <SelectLabel>
              {t('dataExplorer:filters.jsonModes.advanced', {
                defaultValue: 'Advanced',
              })}
            </SelectLabel>

            <SelectItem value="keyValue" className="text-xs">
              {t('dataExplorer:filters.jsonModes.keyValue', {
                defaultValue: 'Key-Value',
              })}
            </SelectItem>

            <SelectItem value="path" className="text-xs">
              {t('dataExplorer:filters.jsonModes.path', {
                defaultValue: 'JSON Path',
              })}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * JsonFilterInput component for filtering JSON/JSONB fields
 */
export function JsonFilterInput({
  filter,
  currentOperator,
  onValueChange,
  t,
}: {
  filter: FilterItem;
  currentOperator: FilterOperator | null;
  onValueChange: (
    filter: FilterItem,
    value: FilterValue,
    shouldClose?: boolean,
  ) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  // Determine mode based on operator
  const getMode = useCallback(
    (op: FilterOperator): 'simple' | 'keyValue' | 'path' => {
      switch (op) {
        case 'keyEquals':
          return 'keyValue';
        case 'pathExists':
          return 'path';
        default:
          return 'simple';
      }
    },
    [],
  );

  // Initialize unified state from current filter value
  const getInitialState = useCallback(() => {
    const currentValue = filter.values[0]?.value;
    // For JSON columns, default to containsText for text search
    // Only use currentOperator if it's a valid JSON operator
    const jsonOperators = ['containsText', 'keyEquals', 'pathExists', 'hasKey'];

    const operator =
      currentOperator && jsonOperators.includes(currentOperator)
        ? currentOperator
        : 'containsText';

    if (!currentValue || typeof currentValue !== 'string') {
      return {
        operator,
        simpleSearch: '',
        jsonKey: '',
        jsonValue: '',
        jsonPath: '',
        validationError: null,
      };
    }

    // Parse value based on operator
    switch (operator) {
      case 'keyEquals': {
        const [key = '', value = ''] = currentValue.split(':');
        return {
          operator,
          simpleSearch: '',
          jsonKey: key.trim(),
          jsonValue: value.trim(),
          jsonPath: '',
          validationError: null,
        };
      }
      case 'pathExists':
        return {
          operator,
          simpleSearch: '',
          jsonKey: '',
          jsonValue: '',
          jsonPath: currentValue,
          validationError: null,
        };
      default:
        return {
          operator,
          simpleSearch: currentValue,
          jsonKey: '',
          jsonValue: '',
          jsonPath: '',
          validationError: null,
        };
    }
  }, [filter.values, currentOperator]);

  const [state, setState] = useState<JsonFilterState>(getInitialState);

  const operator = state.operator;
  const mode = getMode(operator);

  // Update state helper
  const updateState = useCallback((updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validation function
  const validateInput = useCallback(
    (
      op: FilterOperator,
      value: string,
    ): { isValid: boolean; error?: string } => {
      if (!value.trim()) {
        return { isValid: false, error: 'Value cannot be empty' };
      }

      switch (op) {
        case 'hasKey':
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value.trim())) {
            return { isValid: false, error: 'Invalid key format' };
          }
          break;
        case 'keyEquals': {
          if (!value.includes(':')) {
            return { isValid: false, error: 'Format: key:value' };
          }
          const [key, val] = value.split(':');

          if (!key?.trim() || !val?.trim()) {
            return { isValid: false, error: 'Both key and value required' };
          }

          break;
        }

        case 'pathExists':
          if (value !== '$' && !value.startsWith('$.')) {
            return {
              isValid: false,
              error: 'JSONPath must start with $ or $.',
            };
          }
          break;
      }
      return { isValid: true };
    },
    [],
  );

  // Apply filter function
  const applyFilter = useCallback(
    (op: FilterOperator, value: string) => {
      const validation = validateInput(op, value);

      if (!validation.isValid) {
        updateState({ validationError: validation.error || 'Invalid input' });
        return;
      }

      updateState({ validationError: null, operator: op });
      onValueChange(filter, { operator: op, value }, true);
    },
    [filter, onValueChange, validateInput, updateState],
  );

  // Render based on mode
  switch (mode) {
    case 'simple':
      return (
        <div className="space-y-1">
          <ModeSelector mode={mode} updateState={updateState} />

          <div className="space-y-2">
            <Input
              data-testid="json-simple-search"
              className={cn('h-7 text-xs', {
                'border-destructive': state.validationError,
              })}
              value={state.simpleSearch}
              onChange={(e) =>
                updateState({
                  simpleSearch: e.target.value,
                  validationError: null,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && state.simpleSearch.trim()) {
                  applyFilter(operator, state.simpleSearch.trim());
                }
              }}
              placeholder={t('dataExplorer:filters.jsonPlaceholders.simple', {
                defaultValue: 'Search anywhere in JSON...',
              })}
            />

            <ApplyButton
              disabled={!state.simpleSearch.trim()}
              onClick={() => applyFilter(operator, state.simpleSearch.trim())}
            />

            <ErrorDisplay state={state} />
          </div>
        </div>
      );

    case 'keyValue':
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <ModeSelector mode={mode} updateState={updateState} />

            <div className="space-y-1">
              <Input
                data-testid="json-key-input"
                className="h-7 text-xs"
                value={state.jsonKey}
                onChange={(e) =>
                  updateState({
                    jsonKey: e.target.value,
                    validationError: null,
                  })
                }
                placeholder={t('dataExplorer:filters.jsonPlaceholders.key', {
                  defaultValue: 'Key name (e.g., status, email)',
                })}
              />
            </div>

            <div className="space-y-1">
              <Input
                data-testid="json-value-input"
                className="h-7 text-xs"
                value={state.jsonValue}
                onChange={(e) =>
                  updateState({
                    jsonValue: e.target.value,
                    validationError: null,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && state.jsonKey && state.jsonValue) {
                    const keyValue = `${state.jsonKey}:${state.jsonValue}`;
                    applyFilter('keyEquals', keyValue);
                  }
                }}
                placeholder={t('dataExplorer:filters.jsonPlaceholders.value', {
                  defaultValue:
                    'Expected value (e.g., active, john@example.com)',
                })}
              />
            </div>
          </div>

          <ApplyButton
            disabled={!state.jsonKey || !state.jsonValue}
            onClick={() => {
              const keyValue = `${state.jsonKey}:${state.jsonValue}`;
              applyFilter('keyEquals', keyValue);
            }}
          />

          <ErrorDisplay state={state} />
        </div>
      );

    case 'path':
      return (
        <div className="space-y-1">
          <ModeSelector mode={mode} updateState={updateState} />

          <div className="space-y-1">
            <Input
              data-testid="json-path-input"
              className={cn('h-7 font-mono text-xs', {
                'border-destructive': state.validationError,
              })}
              value={state.jsonPath}
              onChange={(e) =>
                updateState({ jsonPath: e.target.value, validationError: null })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && state.jsonPath) {
                  applyFilter('pathExists', state.jsonPath);
                }
              }}
              placeholder="$.user.profile.email"
            />
          </div>

          <ApplyButton
            disabled={!state.jsonPath}
            onClick={() => applyFilter('pathExists', state.jsonPath)}
          />

          <ErrorDisplay state={state} />
        </div>
      );

    default:
      return null;
  }
}

// Error display component
function ErrorDisplay({ state }: { state: JsonFilterState }) {
  return state.validationError ? (
    <div className="text-destructive py-0.5 text-xs font-medium">
      {state.validationError}
    </div>
  ) : null;
}

// Apply button component
function ApplyButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Button size="sm" className="w-full" disabled={disabled} onClick={onClick}>
      {t('dataExplorer:filters.apply') || 'Apply Filter'}
    </Button>
  );
}
