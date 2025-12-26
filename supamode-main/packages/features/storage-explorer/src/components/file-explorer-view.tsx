import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Link,
  NavLink,
  useLoaderData,
  useNavigate,
  useNavigation,
  useParams,
  useSearchParams,
} from 'react-router';

import { ChevronRightIcon, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Subject, catchError, debounceTime, of, tap } from 'rxjs';

import { useBatchSelection } from '@kit/shared/hooks';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { StorageItem } from '../types';
import { BatchActions } from './batch-actions';
import { CreateFolderDialog } from './create-folder-dialog';
import { FileContextMenu } from './file-context-menu';
import { FileTypeIcon } from './file-icon';
import { FileUploadDialog } from './file-upload-dialog';
import { ImagePreview } from './image-preview';
import { LazyImage } from './lazy-image';

interface FileExplorerData {
  contents: StorageItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function FileExplorerView() {
  const data = useLoaderData<FileExplorerData>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const bucket = params['bucket']!;
  const currentPath = params['*'] || '';

  // Get search and pagination from URL
  const urlSearch = searchParams.get('search') || '';

  // Local search input state for immediate UI feedback
  const [searchInput, setSearchInput] = useState<string>(urlSearch);

  // Image preview state
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const contents = data.contents;
  const pagination = data.pagination;

  // Batch selection functionality
  const batchSelection = useBatchSelection(
    contents,
    (item) => item.name,
    25, // Maximum selectable items
  );

  // Create a subject for search input - similar to global-search.tsx
  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  const pathSegments = useMemo(() => {
    return currentPath ? currentPath.split('/').filter(Boolean) : [];
  }, [currentPath]);

  if (urlSearch !== searchInput) {
    setSearchInput(urlSearch);
  }

  // Set up RxJS search subscription - similar to global-search.tsx
  useEffect(() => {
    const subscription = searchSubject$
      .pipe(
        // Debounce the search query to prevent excessive URL updates
        debounceTime(1000), // 1000ms debounce as requested
        // Update URL search params
        tap((searchQuery) => {
          setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            if (searchQuery.trim()) {
              newParams.set('search', searchQuery.trim());
            } else {
              newParams.delete('search');
            }

            // Reset to page 1 when searching
            newParams.delete('page');

            return newParams;
          });
        }),
        // Handle errors gracefully
        catchError((error) => {
          console.error('Search error:', error);
          return of(''); // Return empty string to continue the stream
        }),
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [searchSubject$, setSearchParams]);

  const handleItemClick = useCallback(
    (item: StorageItem, event: React.MouseEvent) => {
      // If checkbox was clicked, don't handle item click
      if ((event.target as HTMLElement).closest('[data-checkbox]')) {
        return;
      }

      // SECURITY: Only allow navigation if user has read permission
      const permissions = item.permissions || { canRead: false };

      if (!permissions.canRead) {
        return;
      }

      if (item.isDirectory) {
        const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;

        navigate(`/assets/${bucket}/${newPath}`);
      } else if (item.fileType === 'image') {
        // Open image preview for image files
        setPreviewItem(item);
        setIsPreviewOpen(true);
      }
      // For other files, we could implement download functionality
    },
    [bucket, currentPath, navigate],
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === -1) {
        // Navigate to bucket root
        navigate(`/assets/${bucket}`);
      } else {
        // Navigate to specific path
        const pathToNavigate = pathSegments.slice(0, index + 1).join('/');
        navigate(`/assets/${bucket}/${pathToNavigate}`);
      }
    },
    [bucket, navigate, pathSegments],
  );

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewItem(null);
  }, []);

  const handleNavigatePreview = useCallback((item: StorageItem) => {
    setPreviewItem(item);
  }, []);

  // Determine if user can upload to current location
  // If there are contents, check if any have upload permission
  // If no contents, assume upload is possible (server will validate)
  const canUpload = useMemo(() => {
    if (contents.length === 0) {
      return true; // Show upload button for empty folders, let server validate
    }

    // Check if any item has upload permission (indicates folder allows uploads)
    return contents.some((item) => item.permissions?.canUpload);
  }, [contents]);

  // Get folder name for upload dialog
  const folderName = useMemo(() => {
    if (pathSegments.length === 0) {
      return bucket; // Root of bucket
    }

    return pathSegments[pathSegments.length - 1] || bucket;
  }, [bucket, pathSegments]);

  useEffect(() => {
    // remove contents from selection if they are not in the new contents
    batchSelection.getSelectedRecords().forEach((item) => {
      if (!contents.some((content) => content.name === item.name)) {
        batchSelection.toggleSelection(item.name);
      }
    });
  }, [contents, batchSelection]);

  const isLoading = useNavigation().state === 'loading';

  return (
    <div
      className={cn(
        'flex h-full h-screen max-h-screen flex-1 flex-col transition-opacity duration-300',
        {
          'opacity-50': isLoading,
        },
      )}
    >
      <div>
        <div className="flex h-14 items-center space-x-2.5 px-4 py-2">
          <div className="flex flex-1 items-center space-x-2.5">
            <div className="flex flex-1 flex-col">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink className="cursor-pointer" asChild>
                      <NavLink to="/assets">
                        <Trans i18nKey="storageExplorer:title" />
                      </NavLink>
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  <BreadcrumbSeparator>
                    <ChevronRightIcon className="h-4 w-4" />
                  </BreadcrumbSeparator>

                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => handleBreadcrumbClick(-1)}
                      className="cursor-pointer"
                    >
                      {bucket}
                    </BreadcrumbLink>
                  </BreadcrumbItem>

                  {pathSegments.map((segment, index) => (
                    <BreadcrumbList key={index}>
                      <BreadcrumbSeparator>
                        <ChevronRightIcon className="h-4 w-4" />
                      </BreadcrumbSeparator>

                      <BreadcrumbItem>
                        <BreadcrumbLink
                          onClick={() => handleBreadcrumbClick(index)}
                          className={cn(
                            (index === pathSegments.length - 1 &&
                              'text-muted-foreground') ||
                              'cursor-pointer',
                          )}
                        >
                          {segment}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Batch Selection and Actions */}
            <If condition={contents.length > 0}>
              <label className="hover:bg-muted/50 flex cursor-pointer items-center space-x-2.5 rounded-md px-3 py-2">
                <Checkbox
                  checked={
                    batchSelection.isSomeSelected
                      ? 'indeterminate'
                      : batchSelection.isAllSelected
                  }
                  onCheckedChange={(checked) => {
                    if (checked === 'indeterminate') {
                      batchSelection.toggleSelectAll(true);
                    } else {
                      batchSelection.toggleSelectAll(checked === true);
                    }
                  }}
                />

                <span className="text-muted-foreground text-sm">
                  <Trans
                    i18nKey={
                      batchSelection.isAllSelected
                        ? 'storageExplorer:deselectAll'
                        : 'storageExplorer:selectAll'
                    }
                  />
                </span>
              </label>
            </If>

            <BatchActions
              selectedItems={batchSelection.getSelectedRecords()}
              selectedCount={batchSelection.selectedCount}
              onClearSelection={batchSelection.clearSelection}
            />
          </div>

          {/* Upload Button */}
          <FileUploadDialog
            bucket={bucket}
            currentPath={currentPath}
            folderName={folderName}
            canUpload={canUpload}
            allowedMimeTypes={[]}
          />

          {/* Create Folder Button */}
          <CreateFolderDialog canCreate={canUpload} />
        </div>

        <div className="relative flex items-center gap-x-2.5 px-4">
          <Search className="text-muted-foreground absolute left-7 h-3.5 w-3.5" />

          <Input
            className={'pl-8 text-sm'}
            placeholder={t('storageExplorer:searchFiles')}
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);
              searchSubject$.next(value);
            }}
          />

          <If condition={searchInput}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                searchSubject$.next('');
              }}
              className="absolute top-1/2 right-6 h-6 w-6 -translate-y-1/2 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </If>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col space-y-4 rounded-lg px-4">
        {/* Search Results Header */}
        <If condition={urlSearch}>
          <div className="flex items-center gap-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('');
                searchSubject$.next('');
              }}
            >
              <X className="mr-2 h-3 w-3" />

              <span className="text-muted-foreground text-sm">
                <Trans i18nKey="storageExplorer:clearSearch" />
              </span>
            </Button>
          </div>
        </If>

        <If condition={contents.length === 0}>
          <EmptyState className="flex flex-1 flex-col">
            <EmptyStateHeading className="flex flex-col items-center justify-center">
              <FileTypeIcon
                fileType="folder"
                isDirectory={true}
                className="mb-4 h-6 w-14"
              />

              <h4 className="text-lg font-medium">
                <If condition={urlSearch}>
                  <Trans
                    i18nKey="storageExplorer:noSearchResults"
                    values={{ searchTerm: urlSearch }}
                  />
                </If>

                <If condition={!urlSearch}>
                  <Trans i18nKey="storageExplorer:emptyFolderTitle" />
                </If>
              </h4>
            </EmptyStateHeading>

            <EmptyStateText className={'mb-4'}>
              <If condition={!urlSearch}>
                <Trans
                  i18nKey="storageExplorer:emptyFolderDescription"
                  components={{
                    goBackLink: (
                      <Link to={`../`} className="underline">
                        <Trans i18nKey="storageExplorer:goBack" />
                      </Link>
                    ),
                  }}
                />
              </If>

              <If condition={urlSearch}>
                <Trans i18nKey="storageExplorer:noSearchResultsDescription" />
              </If>
            </EmptyStateText>

            <EmptyStateButton asChild>
              <FileUploadDialog
                bucket={bucket}
                currentPath={currentPath}
                folderName={folderName}
                canUpload={canUpload}
                allowedMimeTypes={[]}
              />
            </EmptyStateButton>
          </EmptyState>
        </If>

        <If condition={contents.length > 0}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {contents.map((item) => {
              const permissions = item.permissions || { canRead: false };
              const isAccessible = permissions.canRead;

              return (
                <div
                  key={item.name}
                  className={cn(
                    'border-input group relative flex h-full w-full flex-1 flex-col items-center rounded-md border',
                    batchSelection.isSelected(item.name) && 'border-primary',
                  )}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10" data-checkbox>
                    <Checkbox
                      checked={batchSelection.isSelected(item.name)}
                      onCheckedChange={() =>
                        batchSelection.toggleSelection(item.name)
                      }
                      aria-label={`Select ${item.name}`}
                      className="bg-white/80 backdrop-blur-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* File/Folder representation */}
                  <div
                    className={cn(
                      'bg-muted h-32 w-auto cursor-pointer overflow-hidden rounded-md hover:opacity-80',
                      isAccessible
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-50',
                    )}
                    onClick={(event) => handleItemClick(item, event)}
                  >
                    <If
                      condition={item.fileType === 'image' && item.previewUrl}
                    >
                      {() => (
                        <LazyImage
                          src={item.previewUrl!}
                          alt={item.name}
                          className="h-full w-full rounded-md"
                          fallbackClassName="h-full w-full rounded-md"
                        />
                      )}
                    </If>

                    <If
                      condition={
                        !(item.fileType === 'image' && item.previewUrl)
                      }
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-md">
                        <FileTypeIcon
                          fileType={item.fileType}
                          isDirectory={item.isDirectory}
                          className="h-8 w-8"
                        />
                      </div>
                    </If>
                  </div>

                  {/* File name */}
                  <div className="flex h-9 w-full items-center justify-between gap-x-4 px-2">
                    <p
                      className="block max-w-full truncate text-[0.65rem] leading-tight font-medium"
                      style={{
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.name}
                    </p>

                    <FileContextMenu
                      item={item}
                      bucket={bucket}
                      currentPath={currentPath}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </If>

        {/* Pagination */}
        <If condition={pagination.totalPages > 1}>
          <div className="bg-background/80 sticky bottom-0 flex items-center justify-between border-t px-6 py-4 backdrop-blur-sm">
            <div className="text-muted-foreground text-sm">
              <Trans
                i18nKey="storageExplorer:paginationInfo"
                values={{
                  current: pagination.page,
                  total: pagination.totalPages,
                  count: pagination.total,
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => {
                  setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('page', String(pagination.page - 1));
                    return newParams;
                  });
                }}
              >
                <Trans i18nKey="common:previous" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => {
                  setSearchParams((prev) => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('page', String(pagination.page + 1));
                    return newParams;
                  });
                }}
              >
                <Trans i18nKey="common:next" />
              </Button>
            </div>
          </div>
        </If>
      </div>

      {/* Image Preview Modal */}
      <ImagePreview
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        currentItem={previewItem}
        allItems={contents}
        onNavigate={handleNavigatePreview}
      />
    </div>
  );
}
