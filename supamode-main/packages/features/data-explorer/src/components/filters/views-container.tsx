import { Activity, useCallback, useEffect, useMemo, useState } from 'react';

import { SubmitTarget, useFetcher, useSearchParams } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookmarkIcon,
  CheckIcon,
  PlusCircleIcon,
  SquarePenIcon,
  TrashIcon,
  X,
} from 'lucide-react';
import isEqual from 'react-fast-compare';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  FilterItem,
  FilterOperator,
  SortDirection,
  Views,
  mapDateOperator,
} from '@kit/filters';
import { useRolesQuery } from '@kit/permissions/hooks';
import { savedViewsInSupamode } from '@kit/supabase/schema';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { toast } from '@kit/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

export function SavedViewsDropdown(props: {
  views: Views | undefined;
  filters: FilterItem[];
}) {
  const { t } = useTranslation();

  const [searchParams] = useSearchParams();
  const activeViewId = searchParams.get('view');

  const selectedView = useMemo(() => {
    return (
      props.views?.personal?.find((v) => v.id === activeViewId) ||
      props.views?.team?.find((v) => v.id === activeViewId) ||
      null
    );
  }, [props.views, activeViewId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          data-testid="saved-views-dropdown-trigger"
          className={cn('m-0 h-6 gap-x-1 px-2 py-0 shadow-none', {
            'border-primary': selectedView,
          })}
          size="sm"
        >
          <BookmarkIcon
            className={cn('h-3 w-3', {
              'fill-primary text-primary': selectedView,
            })}
          />

          <span className="text-xs">
            {selectedView?.name || t('dataExplorer:views.savedViews')}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-80">
        <SavedViewsDropdownContent
          views={props.views}
          filters={props.filters}
          selectedView={selectedView}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SavedViewsDropdownContent(props: {
  views: Views | undefined;
  filters: FilterItem[];
  selectedView: typeof savedViewsInSupamode.$inferSelect | null;
}) {
  const { t } = useTranslation();
  const loadSavedView = useLoadSavedView();

  const [searchParams, setSearchParams] = useSearchParams();

  const personalViews = useMemo(
    () => props.views?.personal ?? [],
    [props.views],
  );

  const teamViews = useMemo(() => props.views?.team ?? [], [props.views]);

  const activeViewId = searchParams.get('view');
  const selectedView = props.selectedView;

  const canUpdateView = useMemo(() => {
    return personalViews.some((v) => v.id === activeViewId);
  }, [personalViews, activeViewId]);

  const hasPersonalViews = useMemo(() => {
    return personalViews && personalViews.length > 0;
  }, [personalViews]);

  return (
    <>
      <div className={'flex max-h-[60vh] flex-col overflow-y-auto'}>
        {/* Personal Views */}
        <Activity mode={hasPersonalViews ? 'visible' : 'hidden'}>
          <DropdownMenuGroup
            title={t('dataExplorer:views.personalViews')}
            data-testid="personal-views-section"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('dataExplorer:views.personalViews')}
            </DropdownMenuLabel>

            {personalViews.map((view) => (
              <DropdownMenuItem
                autoFocus={activeViewId === view.id}
                key={view.id}
                data-testid="saved-view-item"
                className={cn(
                  'flex h-6 justify-between text-xs',
                  activeViewId === view.id && 'bg-muted',
                  activeViewId !== view.id && 'cursor-pointer',
                )}
                onClick={() => {
                  if (activeViewId !== view.id) {
                    loadSavedView(view);
                  }
                }}
              >
                {activeViewId === view.id && (
                  <CheckIcon
                    className="mr-1 h-3 w-3"
                    data-testid="active-view-checkmark"
                  />
                )}

                <span className="flex-grow truncate">{view.name}</span>

                <If condition={activeViewId === view.id}>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid="unselect-view-button"
                          className="hover:text-primary h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();

                            setSearchParams((prev) => {
                              prev.delete('view');
                              return prev;
                            });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent>
                        {t('dataExplorer:views.unselectView')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </If>

                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <DeleteViewAlertDialog
                      key={view.id}
                      view={view}
                      onDelete={() => {
                        setSearchParams((prev) => {
                          prev.delete('view');

                          return prev;
                        });
                      }}
                    >
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid="delete-view-button"
                          className="hover:text-destructive h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <TrashIcon className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                    </DeleteViewAlertDialog>

                    <TooltipContent>
                      {t('dataExplorer:views.deleteView')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </Activity>

        {/* Team Views */}
        <Activity
          mode={teamViews && teamViews.length > 0 ? 'visible' : 'hidden'}
        >
          <DropdownMenuGroup
            title={t('dataExplorer:views.teamViews')}
            data-testid="team-views-section"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              {t('dataExplorer:views.teamViews')}
            </DropdownMenuLabel>

            {teamViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                autoFocus={activeViewId === view.id}
                data-testid="saved-view-item"
                className={cn(
                  'flex h-6 justify-between text-xs',
                  activeViewId === view.id && 'bg-muted',
                  activeViewId !== view.id && 'cursor-pointer',
                )}
                onClick={() => {
                  if (activeViewId !== view.id) {
                    loadSavedView(view);
                  }
                }}
              >
                {activeViewId === view.id && (
                  <CheckIcon
                    className="mr-1 h-3 w-3"
                    data-testid="active-view-checkmark"
                  />
                )}

                <span className="flex-grow truncate">{view.name}</span>

                <div className="flex items-center gap-x-1">
                  <If condition={activeViewId === view.id}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            data-testid="unselect-view-button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>

                        <TooltipContent>
                          {t('dataExplorer:views.unselectView')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </If>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </Activity>
      </div>

      {(!personalViews || personalViews.length === 0) &&
        (!teamViews || teamViews.length === 0) && (
          <div
            className="text-muted-foreground px-2 py-4 text-center text-xs"
            data-testid="no-saved-views"
          >
            <p className="mb-1">{t('dataExplorer:views.noViews')}</p>
          </div>
        )}

      <DropdownMenuSeparator />

      <Activity mode={selectedView && canUpdateView ? 'visible' : 'hidden'}>
        <SaveViewButton selectedView={selectedView} filters={props.filters} />
      </Activity>

      <Activity mode={selectedView ? 'hidden' : 'visible'}>
        <CreateViewDialog key={selectedView?.id} filters={props.filters}>
          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
            <Button
              variant="ghost"
              size="sm"
              data-testid="save-current-view-button"
              className="!hover:border-border w-full"
            >
              <PlusCircleIcon className="mr-2 h-3.5 w-3.5" />

              <span>{t('dataExplorer:views.saveCurrentView')}</span>
            </Button>
          </DropdownMenuItem>
        </CreateViewDialog>
      </Activity>
    </>
  );
}

function SaveViewButton({
  selectedView,
  filters,
}: {
  selectedView: typeof savedViewsInSupamode.$inferSelect | null;
  filters: FilterItem[];
}) {
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const [searchParams] = useSearchParams();
  const activeViewId = searchParams.get('view');
  const isSubmitting = fetcher.state === 'submitting';
  const viewConfig = useViewConfig({ filters });

  const savedViewDidChange = useMemo(() => {
    if (!selectedView) {
      return false;
    }

    // Extract essential data from saved config for comparison
    const savedConfig = selectedView.config as {
      filters?: Array<{
        name: string;
        values: unknown;
        [key: string]: unknown;
      }>;
      sort?: { column: string; direction: SortDirection };
      search?: string;
    };

    // For legacy saved views with full FilterItem objects, extract just the essential data
    // For new saved views, they should already be in clean format
    // Normalize by excluding label properties for consistent comparison
    const normalizedSavedConfig = {
      filters:
        savedConfig.filters?.map((filter) => ({
          name: filter.name,
          values: Array.isArray(filter.values)
            ? filter.values.map((v) => ({
                operator: v.operator,
                value: v.value,
              }))
            : filter.values,
        })) || [],
      sort: savedConfig.sort,
      search: savedConfig.search,
    };

    // Build current config from URL parameters (more reliable than props.filters)
    const currentUrlConfig = (() => {
      const sortColumn = searchParams.get('sort_column');

      const sortDirection = searchParams.get('sort_direction') as
        | 'asc'
        | 'desc'
        | null;

      const search = searchParams.get('search') || undefined;

      // Extract filters from URL parameters
      const filters: Array<{
        name: string;
        values: Array<{ operator: string; value: unknown }>;
      }> = [];

      for (const [key, value] of searchParams.entries()) {
        if (
          key.includes('.') &&
          !['sort_column', 'sort_direction', 'search', 'view'].includes(key)
        ) {
          const parts = key.split('.');
          const columnName = parts[0];
          const operator = parts[1];

          if (columnName && operator) {
            const existingFilter = filters.find((f) => f.name === columnName);

            if (existingFilter) {
              existingFilter.values.push({ operator, value });
            } else {
              filters.push({
                name: columnName,
                values: [{ operator, value }],
              });
            }
          }
        }
      }

      return {
        filters,
        sort:
          sortColumn && sortDirection
            ? { column: sortColumn, direction: sortDirection }
            : undefined,
        search,
      };
    })();

    return !isEqual(normalizedSavedConfig, currentUrlConfig);
  }, [selectedView, searchParams]);

  return (
    <Button
      disabled={isSubmitting || !activeViewId || !savedViewDidChange}
      variant="ghost"
      size="sm"
      data-testid="update-saved-view-button"
      className="!hover:border-border w-full"
      onClick={() => {
        if (!activeViewId) {
          return;
        }

        return fetcher.submit(
          {
            intent: 'update-saved-view',
            data: {
              config: viewConfig,
              id: activeViewId,
            },
          } as unknown as SubmitTarget,
          {
            method: 'POST',
            encType: 'application/json',
          },
        );
      }}
    >
      <SquarePenIcon className="mr-2 h-3.5 w-3.5" />

      <span>
        {isSubmitting
          ? t('dataExplorer:views.updatingView')
          : t('dataExplorer:views.updateView')}
      </span>
    </Button>
  );
}

/**
 * Create view dialog
 * @param props - The props for the create view dialog
 * @returns The create view dialog
 */
function CreateViewDialog({
  filters,
  children,
}: React.PropsWithChildren<{
  filters: FilterItem[];
}>) {
  const { t } = useTranslation();
  const disabled = filters.length === 0;

  const title = disabled
    ? t('dataExplorer:views.addFiltersFirst')
    : t('dataExplorer:views.saveView');

  const [open, setOpen] = useState(false);
  const loadSavedView = useLoadSavedView();

  const onSuccess = useCallback(
    (view: typeof savedViewsInSupamode.$inferSelect) => {
      setOpen(false);
      loadSavedView(view);
    },
    [setOpen, loadSavedView],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled} title={title}>
        {children}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dataExplorer:views.saveView')}</DialogTitle>

          <DialogDescription>
            {t('dataExplorer:views.saveViewDescription')}
          </DialogDescription>
        </DialogHeader>

        <Activity mode={open ? 'visible' : 'hidden'}>
          <CreateSavedViewForm filters={filters} onSuccess={onSuccess} />
        </Activity>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Use current filters view state
 * @returns The use current filters view state
 */
function useCurrentFiltersViewState() {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const sortColumn = searchParams.get('sort_column');

    const sortDirection = searchParams.get('sort_direction') as
      | 'asc'
      | 'desc'
      | undefined;

    const search = searchParams.get('search') || '';

    return { sortColumn, sortDirection, search };
  }, [searchParams]);
}

/**
 * Use view config
 * @param props - The props for the use view config
 * @returns The use view config
 */
function useViewConfig(props: { filters: FilterItem[] }) {
  const { sortColumn, sortDirection, search } = useCurrentFiltersViewState();

  return useMemo(() => {
    const sort =
      sortColumn && sortDirection
        ? {
            column: sortColumn,
            direction: sortDirection,
          }
        : undefined;

    // Only store essential filter data, not full column metadata
    const cleanFilters = props.filters.map((filter) => ({
      name: filter.name,
      values: filter.values,
    }));

    const viewConfig: {
      filters: Array<{
        name: string;
        values: Array<{ operator: string; value: unknown; label?: string }>;
      }>;
      sort?: {
        column: string;
        direction: SortDirection;
      };
      search?: string;
    } = {
      filters: cleanFilters,
    };

    if (sort) {
      viewConfig.sort = sort;
    }

    if (search) {
      viewConfig.search = search;
    }

    return viewConfig;
  }, [props.filters, sortColumn, sortDirection, search]);
}

/**
 * Create saved view form
 * @param props - The props for the create saved view form
 * @returns The create saved view form
 */
function CreateSavedViewForm({
  filters,
  onSuccess,
}: {
  filters: FilterItem[];
  onSuccess: (view: typeof savedViewsInSupamode.$inferSelect) => void;
}) {
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    success: boolean;
    data: typeof savedViewsInSupamode.$inferSelect;
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  const form = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        roles: z.array(z.string().uuid()),
        filters: z.array(z.any()),
      }),
    ),
    defaultValues: {
      name: '',
      description: '',
      roles: [],
      filters,
    },
  });

  const viewConfig = useViewConfig({ filters });

  const onSubmit = useCallback(
    (data: {
      name: string;
      description?: string | undefined;
      roles: string[];
    }) => {
      const payload = {
        name: data.name,
        description: data.description || '',
        roles: data.roles,
        config: viewConfig ?? {},
      };

      return fetcher.submit(
        {
          intent: 'create-saved-view',
          data: payload,
        } as unknown as SubmitTarget,
        {
          method: 'POST',
          encType: 'application/json',
        },
      );
    },
    [fetcher, viewConfig],
  );

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.data) {
      // Automatically select the newly created view
      onSuccess(fetcher.data.data);
    }
  }, [fetcher.data, onSuccess]);

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('dataExplorer:views.viewName')}</FormLabel>

              <FormControl>
                <Input
                  placeholder={t('dataExplorer:views.viewName')}
                  data-testid="saved-view-name-input"
                  {...field}
                />
              </FormControl>

              <FormDescription>
                {t('dataExplorer:views.viewNameDescription')}
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-x-1">
                <span>{t('dataExplorer:views.description')}</span>

                <span className="text-muted-foreground text-xs">
                  {t('dataExplorer:record.optional')}
                </span>
              </FormLabel>

              <FormControl>
                <Input
                  placeholder={t('dataExplorer:views.descriptionPlaceholder')}
                  data-testid="saved-view-description-input"
                  {...field}
                />
              </FormControl>

              <FormDescription>
                {t('dataExplorer:views.descriptionHelp')}
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="roles"
          render={() => (
            <FormItem>
              <FormLabel className="flex items-center gap-x-1">
                <span>{t('dataExplorer:views.shareWithRoles')}</span>

                <span className="text-muted-foreground text-xs">
                  {t('dataExplorer:record.optional')}
                </span>
              </FormLabel>

              <FormField
                key={'roles'}
                name="roles"
                render={({ field }) => {
                  return (
                    <FormItem className="py-1">
                      <RolesAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                      />

                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="gap-x-2">
          <DialogClose disabled={isSubmitting} asChild>
            <Button variant="outline">{t('common:cancel')}</Button>
          </DialogClose>

          <Button
            type="submit"
            data-testid="submit-saved-view-button"
            disabled={isSubmitting || !form.formState.isDirty}
          >
            {isSubmitting ? t('common:saving') : t('dataExplorer:views.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Roles autocomplete
 * @param props - The props for the roles autocomplete
 * @returns The roles autocomplete
 */
function RolesAutocomplete(props: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRolesQuery();

  const selectedRolesNames = useMemo(() => {
    return data?.roles
      .filter((role) => props.value.includes(role.id))
      .map((role) => role.name)
      .join(', ');
  }, [data, props.value]);

  return (
    <>
      <FormControl>
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
              data-testid="select-roles-button"
            >
              <PlusCircleIcon className="h-3 w-3" />

              <span className="flex items-center gap-x-1">
                <span>{t('dataExplorer:views.pickRoles')}</span>

                {props.value.length > 0 ? (
                  <span className="text-muted-foreground text-xs">
                    (+{props.value.length})
                  </span>
                ) : null}
              </span>
            </Button>
          </PopoverTrigger>

          <PopoverContent>
            <Command>
              <CommandInput placeholder={t('dataExplorer:views.searchRoles')} />

              <CommandList>
                <CommandEmpty>
                  {t('dataExplorer:views.noRolesFound')}
                </CommandEmpty>
              </CommandList>

              <CommandGroup>
                {isError && (
                  <CommandItem>
                    {t('dataExplorer:views.errorLoadingRoles')}
                  </CommandItem>
                )}

                {isLoading ? (
                  <CommandItem>
                    {t('dataExplorer:views.loadingRoles')}
                  </CommandItem>
                ) : data?.roles ? (
                  data.roles.map((role) => (
                    <CommandItem key={role.id}>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={props.value.includes(role.id)}
                          data-testid={`role-checkbox-${role.name}`}
                          onCheckedChange={(checked) => {
                            props.onChange(
                              checked
                                ? [...props.value, role.id]
                                : props.value.filter((id) => id !== role.id),
                            );
                          }}
                        />

                        <span>{role.name}</span>
                      </label>
                    </CommandItem>
                  ))
                ) : (
                  <CommandItem>
                    {t('dataExplorer:views.noRolesFound')}
                  </CommandItem>
                )}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </FormControl>

      <FormDescription>
        {selectedRolesNames?.length ? (
          <span>
            {t('dataExplorer:views.sharingWithRoles', {
              roles: selectedRolesNames,
            })}
          </span>
        ) : (
          <span>{t('dataExplorer:views.noRolesSelected')}</span>
        )}
      </FormDescription>
    </>
  );
}

/**
 * Use load saved view
 * @returns The use load saved view hook
 */
function useLoadSavedView() {
  const { t } = useTranslation();
  const [_, setSearchParams] = useSearchParams();

  return useCallback(
    (view: typeof savedViewsInSupamode.$inferSelect) => {
      interface ViewConfig {
        filters?: Array<{
          name: string;
          ui_config?: {
            data_type: string;
            [key: string]: unknown;
          };
          values?: Array<{
            value: unknown;
            operator?: string;
          }>;
          [key: string]: unknown;
        }>;
        sort?: {
          column: string;
          direction: 'asc' | 'desc';
        };
        search?: string;
      }

      // Ensure config is properly typed
      const config = (view.config as ViewConfig) || {};

      if (!config) {
        toast.error(t('dataExplorer:views.viewNotFound'));

        return;
      }

      // Create new search params from the view config
      const params = new URLSearchParams();

      // Add filters
      if (config.filters && Array.isArray(config.filters)) {
        config.filters.forEach((filter) => {
          if (!filter.values || !filter.values.length) return;

          const filterValue = filter.values[0];
          const value = filterValue?.value;

          let operator = filterValue?.operator || 'eq';

          // Map date operators to SQL operators
          // Handle both legacy format (with ui_config) and new clean format (without ui_config)
          const dataType = filter.ui_config?.data_type;
          if (
            dataType &&
            ['date', 'timestamp', 'timestamp with time zone'].includes(dataType)
          ) {
            operator = mapDateOperator(operator as FilterOperator);
          }

          if (value !== null && value !== undefined) {
            // Convert Date objects to ISO strings
            const stringValue =
              value instanceof Date ? value.toISOString() : String(value);

            // Set the param
            params.set(`${filter.name}.${operator}`, stringValue);
          }
        });
      }

      // Add sort if present
      if (config.sort) {
        params.set('sort_column', config.sort.column);
        params.set('sort_direction', config.sort.direction);
      }

      // Add search if present
      if (config.search) {
        params.set('search', config.search);
      }

      params.set('view', view.id);

      // Update URL
      setSearchParams(params);

      return view;
    },
    [setSearchParams, t],
  );
}

/**
 * Delete view alert dialog
 * @param props - The props for the delete view alert dialog
 * @returns The delete view alert dialog
 */
function DeleteViewAlertDialog({
  onDelete,
  view,
  children,
}: React.PropsWithChildren<{
  onDelete: () => void;
  view: {
    name: string;
    id: string;
  };
}>) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <DeleteSavedViewForm
          onDelete={() => {
            setOpen(false);
            onDelete();
          }}
          view={view}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteSavedViewForm({
  onDelete,
  view,
}: {
  onDelete: () => void;
  view: {
    id: string;
    name: string;
  };
}) {
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    success: boolean;
  }>({
    key: 'delete-saved-view',
  });

  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.data?.success) {
      onDelete();
    }
  }, [fetcher.data, onDelete]);

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {t('dataExplorer:views.deleteView', { name: view.name })}
        </AlertDialogTitle>

        <AlertDialogDescription>
          {t('dataExplorer:views.deleteViewDescription')}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>

        <AlertDialogAction asChild>
          <Button
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
            variant={'destructive'}
            data-testid="confirm-delete-view-button"
            onClick={() => {
              void fetcher.submit(
                {
                  intent: 'delete-saved-view',
                  data: {
                    viewId: view.id,
                  },
                },
                {
                  method: 'DELETE',
                  encType: 'application/json',
                },
              );
            }}
          >
            {isSubmitting ? t('common:deleting') : t('common:deleteResource')}
          </Button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
