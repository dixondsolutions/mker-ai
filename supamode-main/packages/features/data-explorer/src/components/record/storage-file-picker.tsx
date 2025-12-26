import { useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronLeft,
  Download,
  Eye,
  File,
  Folder,
  FolderOpen,
  Image,
  Link,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { ControllerRenderProps, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@kit/ui/dropzone';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@kit/ui/input-group';
import { Label } from '@kit/ui/label';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Skeleton } from '@kit/ui/skeleton';
import { toast } from '@kit/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';
import { useSupabaseUpload } from '@kit/ui/use-supabase-upload';
import { cn } from '@kit/ui/utils';

import {
  type Bucket,
  type StorageFile,
  useBucketContents,
  useBuckets,
  useFilePickerNavigation,
} from './hooks/use-storage-file-picker';

// Utility function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface StorageFilePickerProps {
  field: ControllerRenderProps;
  placeholder?: string;
  asDialog?: boolean;
  defaultOpen?: boolean;
}

interface FilePickerContentProps {
  field: ControllerRenderProps;
  onClose: () => void;
}

function FilePickerContent({ field, onClose }: FilePickerContentProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<StorageFile | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const supabaseClient = useSupabase();
  const bucketsQuery = useBuckets();
  const filesQuery = useBucketContents();

  const triggerFilesQuerySearch = filesQuery.triggerSearch;
  const triggerBucketsQuerySearch = bucketsQuery.triggerSearch;

  // Navigation callback to trigger file searches
  const handleNavigate = useCallback(
    (bucket: string, path: string, searchTerm: string) => {
      triggerFilesQuerySearch(bucket, path, searchTerm);
    },
    [triggerFilesQuerySearch],
  );

  // Use custom hooks for state management and data fetching
  const navigation = useFilePickerNavigation(handleNavigate);

  // Upload hook for file uploads
  const uploadConfig = useSupabaseUpload({
    bucketName: navigation.selectedBucket || '',
    path: navigation.currentPath || '',
    client: supabaseClient,
    maxFiles: 10,
    onUploadSuccess: (filePaths) => {
      toast.success(
        <Trans
          i18nKey="dataExplorer:record.filesUploaded"
          values={{ count: filePaths.length }}
        />,
      );
      // Refresh the file list after upload
      if (navigation.selectedBucket) {
        triggerFilesQuerySearch(
          navigation.selectedBucket,
          navigation.currentPath,
          navigation.searchTerm,
        );
      }
      setShowUpload(false);
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: StorageFile) => {
      if (!navigation.selectedBucket || file.isDirectory) {
        return;
      }

      const bucket = navigation.selectedBucket;

      const filePath = (
        navigation.currentPath
          ? [bucket, navigation.currentPath, file.name]
          : [bucket, file.name]
      )
        .filter(Boolean)
        .join('/');

      field.onChange(filePath, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      onClose();

      toast.success(<Trans i18nKey="dataExplorer:record.fileSelected" />);
    },
    [navigation, field, onClose],
  );

  // Handle search term changes
  const handleSearchChange = useCallback(
    (searchTerm: string) => {
      navigation.setSearchTerm(searchTerm);

      if (navigation.selectedBucket) {
        // Search files in current bucket/path
        triggerFilesQuerySearch(
          navigation.selectedBucket,
          navigation.currentPath,
          searchTerm,
        );
      } else {
        // Search buckets
        triggerBucketsQuerySearch(searchTerm);
      }
    },
    [navigation, triggerBucketsQuerySearch, triggerFilesQuerySearch],
  );

  // Render file icon based on type
  const getFileIcon = useCallback((file: StorageFile) => {
    if (file.isDirectory) {
      return <Folder className="h-4 w-4 min-w-4 text-blue-500" />;
    }

    switch (file.fileType) {
      case 'image':
        return <Image className="h-4 w-4 min-w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 min-w-4 text-gray-500" />;
    }
  }, []);

  // Handle file preview selection (not final selection)
  const handleFilePreview = useCallback((file: StorageFile) => {
    if (!file.isDirectory) {
      setSelectedFile(file);
    }
  }, []);

  // Initialize bucket search when component mounts
  useEffect(() => {
    triggerBucketsQuerySearch('');
  }, [triggerBucketsQuerySearch]);

  // Trigger file search immediately when bucket changes
  useEffect(() => {
    if (navigation.selectedBucket) {
      triggerFilesQuerySearch(
        navigation.selectedBucket,
        navigation.currentPath,
        navigation.searchTerm,
      );
    }
  }, [
    navigation.selectedBucket,
    navigation.currentPath,
    navigation.searchTerm,
    triggerFilesQuerySearch,
  ]);

  return (
    <div className="flex h-[60vh] flex-col gap-y-1">
      {/* Search Header */}
      <div>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

          <Input
            placeholder={t('dataExplorer:record.searchFiles')}
            value={navigation.searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pr-10 pl-10"
          />

          <If condition={navigation.searchTerm}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </If>
        </div>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 py-0.5">
          <If condition={navigation.selectedBucket || navigation.currentPath}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigation.handleGoBack();

                setSelectedFile(null); // Clear preview when navigating
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              <Trans i18nKey="common:back" />
            </Button>

            <span className="text-muted-foreground text-sm">/</span>
          </If>

          {/* Breadcrumb */}
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <If condition={navigation.selectedBucket}>
              <span className="font-medium">{navigation.selectedBucket}</span>

              {navigation.pathSegments.map((segment: string, index: number) => (
                <span key={index}>
                  <span className="mx-1">/</span>
                  <span>{segment}</span>
                </span>
              ))}
            </If>
          </div>
        </div>

        {/* Upload Button */}
        <If condition={navigation.selectedBucket && !showUpload}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="mr-1 h-4 w-4" />
            <Trans i18nKey="dataExplorer:uploadFiles" />
          </Button>
        </If>
      </div>

      {/* Upload Section */}
      <If condition={showUpload && navigation.selectedBucket}>
        <div>
          <div className="mb-1 flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Dropzone {...uploadConfig}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        </div>
      </If>

      {/* Main Content Area with Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Browser */}
        <div
          className={cn('flex-1 rounded-lg border', selectedFile && 'w-1/2')}
        >
          <ScrollArea className="h-full">
            <Command shouldFilter={false}>
              <CommandList>
                {/* Loading States */}
                <If condition={bucketsQuery.loading || filesQuery.loading}>
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="bg-muted h-8 w-full" />
                    ))}
                  </div>
                </If>

                {/* Buckets List */}
                <If
                  condition={
                    !navigation.selectedBucket && !bucketsQuery.loading
                  }
                >
                  <CommandGroup heading={t('storageExplorer:buckets')}>
                    <If
                      condition={
                        !bucketsQuery.data || bucketsQuery.data.length === 0
                      }
                      fallback={bucketsQuery.data?.map((bucket: Bucket) => (
                        <CommandItem
                          key={bucket.name}
                          onSelect={() => {
                            navigation.handleBucketSelect(bucket.name);
                            setSelectedFile(null);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-blue-500" />

                            <span>{bucket.name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    >
                      <CommandEmpty>
                        <If condition={navigation.searchTerm}>
                          <Trans
                            i18nKey="dataExplorer:record.noBucketsFoundForSearch"
                            values={{ searchTerm: navigation.searchTerm }}
                          />
                        </If>

                        <If condition={!navigation.searchTerm}>
                          <Trans i18nKey="storageExplorer:noBuckets" />
                        </If>
                      </CommandEmpty>
                    </If>
                  </CommandGroup>
                </If>

                {/* Files List */}
                <If
                  condition={navigation.selectedBucket && !filesQuery.loading}
                >
                  <CommandGroup>
                    <If
                      condition={
                        !filesQuery.data || filesQuery.data.length === 0
                      }
                      fallback={filesQuery.data?.map((file: StorageFile) => (
                        <CommandItem
                          key={file.name}
                          onSelect={() => {
                            if (file.isDirectory) {
                              navigation.handleFolderClick(file.name);
                              setSelectedFile(null); // Clear preview when entering folder
                            } else {
                              handleFilePreview(file);
                            }
                          }}
                          className={cn(
                            'cursor-pointer',
                            !file.isDirectory &&
                              file.permissions?.canRead &&
                              'hover:bg-primary/10',
                            selectedFile?.name === file.name &&
                              'bg-primary/5 border-primary border-l-2',
                          )}
                          disabled={
                            !file.isDirectory && !file.permissions?.canRead
                          }
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file)}

                              <span>{file.name}</span>

                              {!file.isDirectory &&
                                !file.permissions?.canRead && (
                                  <span className="text-xs text-red-500">
                                    <Trans i18nKey="common:noAccess" />
                                  </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                              {!file.isDirectory &&
                                file.permissions?.canRead && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFilePreview(file);
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileSelect(file);
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    >
                      <CommandEmpty>
                        <span className="text-muted-foreground">
                          <If condition={navigation.searchTerm}>
                            <Trans
                              i18nKey="dataExplorer:record.noFilesFoundForSearch"
                              values={{ searchTerm: navigation.searchTerm }}
                            />
                          </If>

                          <If condition={!navigation.searchTerm}>
                            <Trans i18nKey="storageExplorer:emptyFolder" />
                          </If>
                        </span>
                      </CommandEmpty>
                    </If>
                  </CommandGroup>
                </If>
              </CommandList>
            </Command>
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <If condition={selectedFile}>
          {(file) => (
            <div className="flex w-1/2 flex-col">
              <div className="flex-1 overflow-auto p-4">
                {/* Image Preview */}
                <If condition={file.fileType === 'image' && file.previewUrl}>
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-lg border bg-gray-50">
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="h-auto max-h-64 w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </If>

                {/* File Details */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-muted-foreground text-xs font-medium">
                      <Trans i18nKey="common:name" />
                    </label>

                    <p className="text-sm break-all">{file.name}</p>
                  </div>

                  <If condition={file.metadata?.['size']}>
                    <div>
                      <label className="text-muted-foreground text-xs font-medium">
                        <Trans i18nKey="common:size" />
                      </label>

                      <p className="text-sm">
                        {formatFileSize(file.metadata?.['size'] as number)}
                      </p>
                    </div>
                  </If>

                  <div>
                    <label className="text-muted-foreground text-xs font-medium">
                      <Trans i18nKey="common:type" />
                    </label>

                    <p className="text-sm capitalize">{file.fileType}</p>
                  </div>

                  <If condition={file.updated_at}>
                    <div>
                      <label className="text-muted-foreground text-xs font-medium">
                        <Trans i18nKey="common:modified" />
                      </label>

                      <p className="text-sm">
                        {new Date(file.updated_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </If>
                </div>
              </div>
            </div>
          )}
        </If>
      </div>

      {/* Fixed Footer with Select Button */}
      <div className="flex items-center justify-between p-3">
        <div className="text-muted-foreground text-xs">
          <Trans i18nKey="dataExplorer:record.filePickerHelp" />
        </div>

        <If condition={selectedFile}>
          {(file) => (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleFileSelect(file)}
                disabled={!file.permissions?.canRead}
                size="sm"
                className="shadow-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                <Trans i18nKey="dataExplorer:record.selectFile" />
              </Button>
            </div>
          )}
        </If>
      </div>
    </div>
  );
}

export function StorageFilePicker({
  field,
  asDialog = true,
}: StorageFilePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!asDialog) {
    return <FilePickerContent field={field} onClose={() => {}} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
        >
          <FolderOpen className="mr-2 h-4 w-4" />

          <Trans i18nKey="dataExplorer:record.browseFiles" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] w-4xl max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="dataExplorer:record.selectFile" />
          </DialogTitle>
        </DialogHeader>

        <FilePickerContent field={field} onClose={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// URL Input Component
function UrlInputContent({ field, onClose }: FilePickerContentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Handle URL submission
  const handleUrlSubmit = useCallback(
    (url: string) => {
      field.onChange(url, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      onClose();

      toast.success(<Trans i18nKey="dataExplorer:record.urlSet" />);
    },
    [field, onClose],
  );

  const form = useForm({
    resolver: zodResolver(
      z.object({
        url: z.url(),
      }),
    ),
    defaultValues: {
      url: '',
    },
  });

  const url = useWatch({ control: form.control, name: 'url' });

  return (
    <div className="flex h-[60vh] flex-col gap-y-4">
      {/* URL Input Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(({ url }) => {
                return handleUrlSubmit(url);
              })}
            >
              <FormField
                name="url"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <InputGroup className="flex gap-2">
                          <InputGroupAddon>
                            <Link className="mr-2 h-4 w-4" />
                          </InputGroupAddon>

                          <InputGroupInput
                            {...field}
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            defaultValue={url}
                            className="flex-1"
                          />

                          <InputGroupAddon align={'inline-end'}>
                            <InputGroupButton type="submit" variant={'default'}>
                              <Trans i18nKey="dataExplorer:record.setUrl" />
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </form>
          </Form>
        </div>

        {/* URL Preview */}
        <If condition={previewUrl}>
          <div className="space-y-2">
            <Label>
              <Trans i18nKey="dataExplorer:record.preview" />
            </Label>

            <div className="overflow-hidden rounded-lg border bg-gray-50 p-4">
              <img
                src={previewUrl!}
                alt="URL Preview"
                className="h-auto max-h-64 w-full object-contain"
                onError={() => setPreviewUrl(null)}
              />
            </div>
          </div>
        </If>

        {/* Current URL display */}
        <If condition={field.value && field.value !== url}>
          <div className="space-y-2">
            <Label>
              <Trans i18nKey="dataExplorer:record.currentValue" />
            </Label>
            <div className="bg-muted rounded p-2 text-sm">
              <span className="break-all">{field.value}</span>
            </div>
          </div>
        </If>
      </div>

      {/* Instructions */}
      <div className="text-muted-foreground text-xs">
        <Trans i18nKey="dataExplorer:record.urlInputHelp" />
      </div>
    </div>
  );
}

// Enhanced wrapper component for text-editor compatibility with tabs
export function StorageFilePickerForTextEditor({
  field,
}: {
  field: ControllerRenderProps;
}) {
  const [activeTab, setActiveTab] = useState<'storage' | 'url'>('storage');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'storage' | 'url')}
    >
      <TabsList>
        <TabsTrigger value="storage" className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <Trans i18nKey="dataExplorer:record.fromStorage" />
        </TabsTrigger>

        <TabsTrigger value="url" className="flex items-center gap-2">
          <Link className="h-4 w-4" />
          <Trans i18nKey="dataExplorer:record.fromUrl" />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="storage" className="mt-4">
        <FilePickerContent field={field} onClose={() => {}} />
      </TabsContent>

      <TabsContent value="url" className="mt-4">
        <UrlInputContent field={field} onClose={() => {}} />
      </TabsContent>
    </Tabs>
  );
}
