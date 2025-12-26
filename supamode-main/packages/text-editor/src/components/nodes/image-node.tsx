import { useCallback, useEffect, useRef, useState } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  DecoratorNode,
  EditorConfig,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  LexicalCommand,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  createCommand,
} from 'lexical';
import { Type } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

export interface ImagePayload {
  altText: string;
  height?: number;
  maxWidth?: number;
  src: string;
  width?: number;
  key?: NodeKey;
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND',
);

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode;

    // Try to get dimensions from CSS styles first, then fallback to attributes
    let width: number | undefined;
    let height: number | undefined;

    // Check CSS styles
    const computedStyle = window.getComputedStyle(domNode);
    const styleWidth = computedStyle.width;
    const styleHeight = computedStyle.height;

    if (styleWidth && styleWidth !== 'auto' && !styleWidth.includes('%')) {
      const widthValue = parseFloat(styleWidth);
      if (!isNaN(widthValue)) {
        width = widthValue;
      }
    }

    if (styleHeight && styleHeight !== 'auto' && !styleHeight.includes('%')) {
      const heightValue = parseFloat(styleHeight);
      if (!isNaN(heightValue)) {
        height = heightValue;
      }
    }

    // Fallback to HTML attributes if no CSS dimensions found
    if (!width && domNode.width) {
      width = domNode.width;
    }

    if (!height && domNode.height) {
      height = domNode.height;
    }

    const node = $createImageNode({
      altText: altText || '',
      height,
      src: src || '',
      width,
      maxWidth: 500,
    });

    return { node };
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    maxWidth?: number;
    src: string;
    width?: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, src } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
    });
    return node;
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img');
    element.setAttribute('src', this.__src);
    element.setAttribute('alt', this.__altText);

    // Apply dimensions as CSS styles, not attributes
    const styles: string[] = [];

    if (this.__width !== 'inherit' && this.__width !== 0) {
      styles.push(`width: ${this.__width}px`);
    }

    if (this.__height !== 'inherit' && this.__height !== 0) {
      styles.push(`height: ${this.__height}px`);
    }

    // Apply max-width constraint
    if (this.__maxWidth) {
      styles.push(`max-width: ${this.__maxWidth}px`);
    }

    // Always add some basic styling for better display
    styles.push('height: auto'); // Maintain aspect ratio

    if (styles.length > 0) {
      element.setAttribute('style', styles.join('; '));
    }

    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    };
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  getWidth(): 'inherit' | number {
    return this.__width;
  }

  getHeight(): 'inherit' | number {
    return this.__height;
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.ReactElement {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  src,
  width,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(src, altText, maxWidth, width, height, key);
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}

type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ImageResizerProps {
  onResizeStart: () => void;
  onResizeEnd: (
    nextWidth: 'inherit' | number,
    nextHeight: 'inherit' | number,
  ) => void;
  imageRef: React.RefObject<HTMLImageElement | null>;
  maxWidth?: number;
  editor: ReturnType<typeof useLexicalComposerContext>[0];
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
  maxWidth,
  editor,
}: ImageResizerProps) {
  const controlWrapperRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: Direction,
  ) => {
    const image = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (image !== null && controlWrapper !== null) {
      event.preventDefault();

      const { width, height } = image.getBoundingClientRect();
      const startWidth = width;
      const startHeight = height;
      const ratio = width / height;
      const startX = event.clientX;
      const startY = event.clientY;
      let isResizing = true;

      const editorRootElement = editor.getRootElement();
      if (editorRootElement !== null) {
        editorRootElement.style.setProperty('user-select', 'none', 'important');
      }

      onResizeStart();

      controlWrapper.classList.add('image-control-wrapper--resizing');
      image.style.height = `${height}px`;
      image.style.width = `${width}px`;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isResizing || image === null) {
          return;
        }

        const isHorizontal = direction.includes('e') || direction.includes('w');
        const isVertical = direction.includes('n') || direction.includes('s');

        let currentWidth = width;
        let currentHeight = height;

        // Corner cursor
        if (isHorizontal && isVertical) {
          let diff = Math.floor(startX - moveEvent.clientX);
          diff = direction.includes('e') ? -diff : diff;

          const newWidth = Math.max(startWidth + diff, 50);

          if (maxWidth !== undefined) {
            currentWidth = Math.min(newWidth, maxWidth);
          } else {
            currentWidth = newWidth;
          }

          currentHeight = currentWidth / ratio;
        } else if (isVertical) {
          let diff = Math.floor(startY - moveEvent.clientY);
          diff = direction.includes('s') ? -diff : diff;

          const newHeight = Math.max(startHeight + diff, 50);

          currentHeight = newHeight;
          currentWidth = currentHeight * ratio;
        } else {
          let diff = Math.floor(startX - moveEvent.clientX);
          diff = direction.includes('e') ? -diff : diff;

          const newWidth = Math.max(startWidth + diff, 50);

          currentWidth = newWidth;
          currentHeight = newWidth / ratio;
        }

        image.style.width = `${currentWidth}px`;
        image.style.height = `${currentHeight}px`;
      };

      const handlePointerUp = () => {
        if (!isResizing) return;

        isResizing = false;

        if (image !== null && controlWrapper !== null) {
          const finalWidth = parseFloat(image.style.width);
          const finalHeight = parseFloat(image.style.height);

          controlWrapper.classList.remove('image-control-wrapper--resizing');

          const editorRoot = editor.getRootElement();
          if (editorRoot !== null) {
            editorRoot.style.setProperty('user-select', 'default');
          }

          onResizeEnd(finalWidth, finalHeight);
        }

        // Remove event listeners
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  };

  return (
    <div ref={controlWrapperRef} className="absolute inset-0">
      <div
        className="absolute h-2 w-2 cursor-nw-resize border border-white bg-blue-500"
        style={{ top: '-6px', left: '-6px' }}
        onPointerDown={(event) => {
          handlePointerDown(event, 'nw');
        }}
      />
      <div
        className="absolute h-2 w-2 cursor-ne-resize border border-white bg-blue-500"
        style={{ top: '-6px', right: '-6px' }}
        onPointerDown={(event) => {
          handlePointerDown(event, 'ne');
        }}
      />
      <div
        className="absolute h-2 w-2 cursor-se-resize border border-white bg-blue-500"
        style={{ bottom: '-6px', right: '-6px' }}
        onPointerDown={(event) => {
          handlePointerDown(event, 'se');
        }}
      />
      <div
        className="absolute h-2 w-2 cursor-sw-resize border border-white bg-blue-500"
        style={{ bottom: '-6px', left: '-6px' }}
        onPointerDown={(event) => {
          handlePointerDown(event, 'sw');
        }}
      />
    </div>
  );
}

interface ImageComponentProps {
  src: string;
  altText: string;
  nodeKey: NodeKey;
  width: 'inherit' | number;
  height: 'inherit' | number;
  maxWidth: number;
}

function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
}: ImageComponentProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelected, setSelected] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isEditingAltText, setIsEditingAltText] = useState<boolean>(false);
  const [altTextValue, setAltTextValue] = useState<string>(altText);
  const [editor] = useLexicalComposerContext();

  const onResizeEnd = useCallback(
    (nextWidth: 'inherit' | number, nextHeight: 'inherit' | number) => {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(nextWidth, nextHeight);
        }
      });
      setIsResizing(false);
    },
    [editor, nodeKey],
  );

  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleAltTextSubmit = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setAltText(altTextValue);
      }
    });
    setIsEditingAltText(false);
  }, [editor, nodeKey, altTextValue]);

  const handleAltTextCancel = useCallback(() => {
    setAltTextValue(altText);
    setIsEditingAltText(false);
  }, [altText]);

  const $onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);

        if ($isImageNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  const $onEnter = useCallback(
    (event: KeyboardEvent) => {
      const latestSelection = $getSelection();
      const buttonElem = event.target;

      if (
        isSelected &&
        $isNodeSelection(latestSelection) &&
        latestSelection.getNodes().length === 1
      ) {
        if (buttonElem === imageRef.current) {
          event.preventDefault();
          return true;
        }
      }
      return false;
    },
    [isSelected],
  );

  const $onEscape = useCallback(
    (_: KeyboardEvent) => {
      if (isSelected) {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          setSelected(false);
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  const onClick = useCallback(
    (payload: MouseEvent) => {
      const event = payload;
      if (isResizing) {
        return true;
      }

      if (event.target === imageRef.current) {
        if (event.shiftKey) {
          setSelected(!isSelected);
        } else {
          if (!isSelected) {
            setSelected(true);
          }
        }
        return true;
      }

      return false;
    },
    [isResizing, isSelected],
  );

  useEffect(() => {
    let isMounted = true;
    const unregister = mergeRegister(
      editor.registerUpdateListener(() => {
        if (isMounted) {
          setSelected(false);
        }
      }),
      editor.registerCommand(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        $onEscape,
        COMMAND_PRIORITY_LOW,
      ),
    );
    return () => {
      isMounted = false;
      unregister();
    };
  }, [editor, onClick, $onDelete, $onEnter, $onEscape]);

  if (altText !== altTextValue) {
    setAltTextValue(altText);
  }

  const draggable = isSelected && !isResizing;

  return (
    <div draggable={draggable} className="group relative inline-block">
      <img
        className={cn(
          'h-auto max-w-full cursor-pointer transition-all',
          isSelected && 'ring-primary dark:ring-primary-900 ring-2',
          isResizing && 'pointer-events-none',
        )}
        src={src}
        alt={altTextValue}
        ref={imageRef}
        style={{
          height: height === 'inherit' ? 'inherit' : height,
          maxWidth: maxWidth,
          width: width === 'inherit' ? 'inherit' : width,
        }}
        draggable="false"
      />

      {isSelected && !isResizing && (
        <ImageResizer
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          imageRef={imageRef}
          maxWidth={maxWidth}
          editor={editor}
        />
      )}

      {isSelected && !isResizing && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 w-7 bg-white/90 p-0 shadow-sm hover:bg-white"
            onClick={() => setIsEditingAltText(true)}
            title="Edit alt text"
          >
            <Type className="h-3 w-3 text-black" />
          </Button>
        </div>
      )}

      {isEditingAltText && (
        <div className="absolute top-0 right-0 left-0 rounded border border-gray-200 bg-white/95 p-2 shadow-lg">
          <div className="flex flex-col gap-2">
            <Input
              value={altTextValue}
              onChange={(e) => setAltTextValue(e.target.value)}
              placeholder="Enter alt text..."
              className="text-sm text-black"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAltTextSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleAltTextCancel();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAltTextCancel}
                className="h-6 text-xs"
              >
                <Trans i18nKey="common:cancel" />
              </Button>

              <Button
                size="sm"
                onClick={handleAltTextSubmit}
                className="h-6 text-xs"
              >
                <Trans i18nKey="common:save" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
