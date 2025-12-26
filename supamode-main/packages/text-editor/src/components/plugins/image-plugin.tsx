import { useEffect, useState } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes } from 'lexical';
import { Image } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Trans } from '@kit/ui/trans';

import { $createImageNode, INSERT_IMAGE_COMMAND } from '../nodes/image-node';

interface FilePickerComponent {
  field: ControllerRenderProps;
  defaultOpen?: boolean;
}

interface ImagePluginProps {
  variant?: 'toolbar' | 'menu';
  defaultOpen?: boolean;
  size?: 'sm' | 'default' | 'lg';
  FilePicker?: React.ComponentType<FilePickerComponent>;
  getPublicUrl?: (filePath: string) => string;
}

export function ImagePlugin({
  variant = 'toolbar',
  size = 'sm',
  FilePicker,
  getPublicUrl,
  defaultOpen = false,
}: ImagePluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedImageUrl] = useState<string>('');

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);
        return true;
      },
      0,
    );
  }, [editor]);

  const handleImageSelect = (filePath: string) => {
    if (!filePath) return;

    // Use the provided getPublicUrl function or fallback to the filePath
    const imageUrl = getPublicUrl ? getPublicUrl(filePath) : filePath;

    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src: imageUrl,
      altText: filePath.split('/').pop() || 'Image',
      maxWidth: 500,
    });

    setIsOpen(false);
  };

  // Create a mock field object that matches the expected interface
  const mockField = {
    onChange: handleImageSelect,
    onBlur: () => {},
    value: selectedImageUrl,
    name: 'imageUrl',
    ref: () => {},
  };

  const ButtonComponent = (
    <Button
      type="button"
      variant={variant === 'toolbar' ? 'ghost' : 'outline'}
      size={size}
      aria-label="Insert Image"
      disabled={!FilePicker || !getPublicUrl}
    >
      <Image className="h-4 w-4" />
      {variant === 'menu' && (
        <span className="ml-2">
          <Trans i18nKey="textEditor:insertImage" />
        </span>
      )}
    </Button>
  );

  if (!FilePicker || !getPublicUrl) {
    return ButtonComponent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{ButtonComponent}</DialogTrigger>

      <DialogContent className="max-h-[85vh] min-h-[40vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="textEditor:selectImageFromStorage" />
          </DialogTitle>
        </DialogHeader>

        <FilePicker field={mockField} defaultOpen={isOpen} />
      </DialogContent>
    </Dialog>
  );
}

export function ImageToolbarButton({
  FilePicker,
  getPublicUrl,
}: {
  FilePicker?: React.ComponentType<FilePickerComponent>;
  getPublicUrl?: (filePath: string) => string;
}) {
  return (
    <ImagePlugin
      variant="toolbar"
      size="sm"
      FilePicker={FilePicker}
      getPublicUrl={getPublicUrl}
      defaultOpen={false}
    />
  );
}

export function ImageMenuButton({
  FilePicker,
  getPublicUrl,
}: {
  FilePicker?: React.ComponentType<FilePickerComponent>;
  getPublicUrl?: (filePath: string) => string;
}) {
  return (
    <ImagePlugin
      variant="menu"
      size="default"
      FilePicker={FilePicker}
      getPublicUrl={getPublicUrl}
    />
  );
}
