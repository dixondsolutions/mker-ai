import { useCallback, useMemo, useState } from 'react';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  XIcon,
} from 'lucide-react';

import { useDateFormatter } from '@kit/formatters/hooks';
import { Button } from '@kit/ui/button';
import { CopyToClipboard } from '@kit/ui/copy-to-clipboard';
import { Dialog, DialogContent, DialogTitle } from '@kit/ui/dialog';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { StorageItem } from '../types';

interface ImagePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: StorageItem | null;
  allItems: StorageItem[];
  onNavigate: (item: StorageItem) => void;
}

export function ImagePreview({
  isOpen,
  onClose,
  currentItem,
  allItems,
  onNavigate,
}: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateFormatter = useDateFormatter();

  // Filter only image items for navigation
  const imageItems = useMemo(() => {
    return allItems.filter((item) => item.fileType === 'image');
  }, [allItems]);

  const currentIndex = useMemo(() => {
    return imageItems.findIndex((item) => item.name === currentItem?.name);
  }, [imageItems, currentItem]);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < imageItems.length - 1;

  const handlePrevious = useCallback(() => {
    if (canNavigatePrev) {
      const prevItem = imageItems[currentIndex - 1];

      if (prevItem) {
        onNavigate(prevItem);
      }
    }
  }, [canNavigatePrev, currentIndex, imageItems, onNavigate]);

  const handleNext = useCallback(() => {
    if (canNavigateNext) {
      const nextItem = imageItems[currentIndex + 1];

      if (nextItem) {
        onNavigate(nextItem);
      }
    }
  }, [canNavigateNext, currentIndex, imageItems, onNavigate]);

  const handleDownload = useCallback(() => {
    if (currentItem?.publicUrl) {
      const link = document.createElement('a');
      link.href = currentItem.publicUrl;
      link.download = currentItem.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentItem]);

  // Reset loading state when image changes
  if (currentItem) {
    setIsLoading(true);
    setError(null);
  }

  const getFileSize = useCallback((item: StorageItem) => {
    if (item.metadata && typeof item.metadata['size'] === 'number') {
      return formatFileSize(item.metadata['size']);
    }

    return '-';
  }, []);

  const formatDate = useCallback(
    (dateString: string | null) => {
      if (!dateString) return '-';

      return dateFormatter(new Date(dateString), 'MMM d, yyyy');
    },
    [dateFormatter],
  );

  if (!currentItem || currentItem.fileType !== 'image') {
    return null;
  }

  const imageUrl = currentItem.previewUrl || currentItem.publicUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">
        <Trans i18nKey="storageExplorer:imagePreview.title" />
      </DialogTitle>

      <DialogContent className="h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw] overflow-hidden p-0 focus:outline-none">
        <div className="flex h-full">
          <div className="relative flex flex-1 flex-col bg-black">
            <div className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-medium">{currentItem.name}</h2>

                <If condition={imageItems.length > 1}>
                  <span className="text-muted-foreground text-sm">
                    <Trans
                      i18nKey="storageExplorer:imagePreview.imageOf"
                      values={{
                        current: currentIndex + 1,
                        total: imageItems.length,
                      }}
                    />
                  </span>
                </If>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="text-white hover:bg-white/20"
                  title="Download (⌘+D)"
                >
                  <DownloadIcon className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                  title="Close (Esc)"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation Arrows */}
            <If condition={canNavigatePrev}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute top-1/2 left-4 z-20 -translate-y-1/2 transform text-white hover:bg-white/20"
                title="Previous (←)"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Button>
            </If>

            <If condition={canNavigateNext}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute top-1/2 right-4 z-20 -translate-y-1/2 transform text-white hover:bg-white/20"
                title="Next (→)"
              >
                <ArrowRightIcon className="h-6 w-6" />
              </Button>
            </If>

            {/* Image Display */}
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="relative max-h-full max-w-full">
                <If condition={isLoading}>
                  <div className="flex h-64 w-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  </div>
                </If>

                <If condition={error}>
                  <div className="flex h-64 w-64 flex-col items-center justify-center text-white">
                    <XIcon className="mb-2 h-8 w-8" />

                    <p className="text-sm">
                      <Trans i18nKey="storageExplorer:imagePreview.failedToLoad" />
                    </p>
                  </div>
                </If>

                <If condition={imageUrl}>
                  <img
                    src={imageUrl}
                    alt={currentItem.name}
                    className={cn(
                      'max-h-full max-w-full object-contain transition-opacity duration-200',
                      isLoading && 'opacity-0',
                      error && 'hidden',
                    )}
                    onLoad={() => {
                      setIsLoading(false);
                      setError(null);
                    }}
                    onError={() => {
                      setIsLoading(false);
                      setError('Failed to load image');
                    }}
                  />
                </If>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="bg-background w-80 overflow-y-auto border-l p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-semibold">
                  <Trans i18nKey="storageExplorer:imagePreview.fileInformation" />
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-x-4">
                    <span className="text-muted-foreground">
                      <Trans i18nKey="storageExplorer:imagePreview.fileName" />:
                    </span>

                    <CopyToClipboard
                      className="truncate font-mono"
                      value={currentItem.name}
                    >
                      {currentItem.name}
                    </CopyToClipboard>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      <Trans i18nKey="storageExplorer:imagePreview.fileSize" />:
                    </span>
                    <span>{getFileSize(currentItem)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      <Trans i18nKey="storageExplorer:imagePreview.fileType" />:
                    </span>
                    <span>{currentItem.fileType}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      <Trans i18nKey="storageExplorer:imagePreview.createdDate" />
                      :
                    </span>
                    <span>{formatDate(currentItem.created_at)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      <Trans i18nKey="storageExplorer:imagePreview.modifiedDate" />
                      :
                    </span>
                    <span>{formatDate(currentItem.updated_at)}</span>
                  </div>
                </div>
              </div>

              <If condition={currentItem.metadata}>
                <div>
                  <h3 className="mb-2 font-semibold">
                    <Trans i18nKey="storageExplorer:imagePreview.metadata" />
                  </h3>

                  <div className="space-y-2 text-sm">
                    {Object.entries(currentItem.metadata || {}).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {key.charAt(0).toUpperCase() + key.slice(1)}:
                          </span>

                          <span className="max-w-32 truncate font-mono">
                            {String(value)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </If>

              <If condition={imageItems.length > 1}>
                <div>
                  <h3 className="mb-2 font-semibold">
                    <Trans i18nKey="storageExplorer:imagePreview.navigation" />
                  </h3>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={!canNavigatePrev}
                      className="flex items-center space-x-2"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span>
                        <Trans i18nKey="storageExplorer:imagePreview.previous" />
                      </span>
                    </Button>

                    <span className="text-muted-foreground text-sm">
                      {currentIndex + 1} / {imageItems.length}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!canNavigateNext}
                      className="flex items-center space-x-2"
                    >
                      <span>
                        <Trans i18nKey="storageExplorer:imagePreview.next" />
                      </span>

                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </If>

              <div>
                <Button
                  onClick={handleDownload}
                  className="w-full"
                  variant="outline"
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  <Trans i18nKey="storageExplorer:imagePreview.downloadImage" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
