import {
  ArchiveIcon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MusicIcon,
  VideoIcon,
} from 'lucide-react';

import { cn } from '@kit/ui/utils';

interface FileIconProps {
  fileType: string;
  isDirectory: boolean;
  className?: string;
}

export function FileTypeIcon({
  fileType,
  isDirectory,
  className,
}: FileIconProps) {
  if (isDirectory) {
    return <FolderIcon className={cn('text-muted-foreground', className)} />;
  }

  const iconClass = cn('text-muted-foreground', className);

  switch (fileType) {
    case 'image':
      return <ImageIcon className={cn('text-green-500', className)} />;
    case 'video':
      return <VideoIcon className={cn('text-red-500', className)} />;
    case 'audio':
      return <MusicIcon className={cn('text-purple-500', className)} />;
    case 'document':
      return <FileTextIcon className={cn('text-blue-600', className)} />;
    case 'archive':
      return <ArchiveIcon className={cn('text-orange-500', className)} />;
    case 'code':
      return <CodeIcon className={cn('text-emerald-500', className)} />;
    default:
      return <FileIcon className={iconClass} />;
  }
}
