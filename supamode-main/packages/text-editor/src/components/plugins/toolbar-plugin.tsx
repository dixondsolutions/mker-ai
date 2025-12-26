import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { autoPlacement, computePosition } from '@floating-ui/dom';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelectionStyleValueForProperty,
  $isAtNodeEnd,
  $patchStyleText,
} from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { Portal } from '@radix-ui/react-portal';
import { BaseSelection, FORMAT_ELEMENT_COMMAND, LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BrushIcon,
  LinkIcon,
  PaintBucket,
} from 'lucide-react';
import { ChromePicker } from 'react-color';
import { ControllerRenderProps } from 'react-hook-form';
import { Subject, debounceTime } from 'rxjs';

import { If } from '@kit/ui/if';
import { cn } from '@kit/ui/utils';

import { ImageToolbarButton } from './image-plugin';

const LowRank = 1;

function FloatingLinkEditor({ editor }: { editor: LexicalEditor }) {
  const editorRef = useRef<HTMLDivElement | null | undefined>(null);
  const inputRef = useRef<HTMLElement | null>(null);
  const mouseDownRef = useRef<boolean>(false);

  const [linkUrl, setLinkUrl] = useState<string>('');
  const [isEditMode, setEditMode] = useState<boolean>(false);

  const [lastSelection, setLastSelection] = useState<BaseSelection | null>(
    null,
  );

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();

      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
      } else {
        setLinkUrl('');
      }
    }

    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (editorElem === null || !nativeSelection) {
      return;
    }

    const rootElement = editor.getRootElement();

    if (
      selection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement?.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0);
      let rect;

      if (nativeSelection.anchorNode === rootElement) {
        let inner: HTMLElement | Element = rootElement;

        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      if (!mouseDownRef.current && editorElem) {
        positionEditorElement(editorElem, rect);
      }

      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      if (editorElem) {
        positionEditorElement(editorElem, null);
      }

      setLastSelection(null);
      setEditMode(false);
      setLinkUrl('');
    }

    return true;
  }, [editor]);

  useEffect(() => {
    const handleEditorFullscreenToggle = () => {
      setEditMode(false);
    };

    document.addEventListener(
      'editor:fullscreen:toggle',
      handleEditorFullscreenToggle,
    );

    return () => {
      document.removeEventListener(
        'editor:fullscreen:toggle',
        handleEditorFullscreenToggle,
      );
    };
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return true;
        },
        LowRank,
      ),
    );
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  // Safely create URL string, fallback to linkUrl if invalid
  const url = (() => {
    if (!linkUrl || linkUrl.trim() === '') {
      return '';
    }
    try {
      return new URL(linkUrl).toString();
    } catch {
      return linkUrl; // Return original string if it's not a valid URL
    }
  })();

  return (
    <div
      ref={(ref) => {
        editorRef.current = ref;
      }}
      className="link-editor"
    >
      {isEditMode ? (
        <input
          ref={(ref) => {
            inputRef.current = ref;
          }}
          className="link-input"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();

              if (lastSelection !== null) {
                if (linkUrl.trim() !== '') {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
                }

                setEditMode(false);
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditMode(false);
            }
          }}
        />
      ) : (
        <>
          <div className="link-input">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            ) : (
              <span>{linkUrl || 'Enter URL...'}</span>
            )}
            <div
              className="link-edit"
              role="button"
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setEditMode(true);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();

  if (anchorNode === focusNode) {
    return anchorNode;
  }

  const isBackward = selection.isBackward();

  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

interface FilePickerComponent {
  field: ControllerRenderProps;
  defaultOpen?: boolean;
}

interface ToolbarPluginProps {
  FilePicker?: React.ComponentType<FilePickerComponent>;
  getPublicUrl?: (filePath: string) => string;
}

export function ToolbarPlugin({
  FilePicker,
  getPublicUrl,
}: ToolbarPluginProps = {}) {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [, setIsCode] = useState(false);
  const [color, setColor] = useState('#000');
  const [backgroundColor, setBackgroundColor] = useState('#fff');
  const { isPointerDown, isPointerReleased } = usePointerInteractions();

  const [editorBusy, setEditorBusy] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const closeToolbar = useCallback(() => {
    setCoords({ x: 0, y: 0 });
  }, []);

  const isVisible = coords.x && coords.y;

  const calculateToolbarPosition = useCallback(() => {
    void calculatePosition(toolbarRef.current, isPointerDown)
      .then((pos) => {
        setCoords({
          x: pos.x,
          y: pos.y + 10,
        });
      })
      .catch(() => {
        // Do nothing
      });
  }, [isPointerDown]);

  const $handleSelectionChange = useCallback(() => {
    if (editorBusy) {
      return;
    }

    if (editor.isComposing()) {
      return closeToolbar();
    }

    const selection = $getSelection();

    if ($isRangeSelection(selection) && !selection.anchor.is(selection.focus)) {
      calculateToolbarPosition();
    } else {
      closeToolbar();
    }
  }, [editorBusy, editor, closeToolbar, calculateToolbarPosition]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => $handleSelectionChange());
    });
  }, [editor, $handleSelectionChange]);

  useEffect(() => {
    const handleEditorFullscreenToggle = () => {
      setCoords({ x: 0, y: 0 });
    };

    document.addEventListener(
      'editor:fullscreen:toggle',
      handleEditorFullscreenToggle,
    );

    return () => {
      document.removeEventListener(
        'editor:fullscreen:toggle',
        handleEditorFullscreenToggle,
      );
    };
  }, []);

  useEffect(() => {
    if (!isVisible && isPointerReleased) {
      editor.getEditorState().read(() => $handleSelectionChange());
    }
    // Adding show to the dependency array causes an issue if
    // a range selection is dismissed by navigating via arrow keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPointerReleased, $handleSelectionChange, editor]);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const textColor = $getSelectionStyleValueForProperty(
        selection,
        'color',
        '#000',
      );

      const backgroundColor = $getSelectionStyleValueForProperty(
        selection,
        'backgroundColor',
        '#fff',
      );

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      setColor(textColor);
      setBackgroundColor(backgroundColor);

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();

      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload) => {
          updateToolbar();
          return false;
        },
        LowRank,
      ),
    );
  }, [editor, updateToolbar]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const alignText = useCallback(
    (value: `left` | `center` | `right`) => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value);
    },
    [editor],
  );

  const VerticalSeparator = () => {
    return <div className="bg-muted h-auto w-[1px]" />;
  };

  return (
    <>
      <Portal>
        <div
          hidden={!isVisible}
          className={cn(
            `toolbar animate-in fade-in zoom-in-90 shadow-3xl absolute dark:border-gray-500`,
            {
              flex: isVisible,
            },
          )}
          ref={(ref) => {
            toolbarRef.current = ref;
          }}
          style={{
            top: coords.y,
            left: coords.x,
          }}
        >
          {
            <If condition={isVisible}>
              <button
                type={'button'}
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
                }}
                className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
                aria-label="Format Bold"
              >
                <b>B</b>
              </button>
              <button
                type={'button'}
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
                }}
                className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
                aria-label="Format Italics"
              >
                <i>I</i>
              </button>
              <button
                type={'button'}
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
                }}
                className={
                  'toolbar-item spaced ' + (isUnderline ? 'active' : '')
                }
                aria-label="Format Underline"
              >
                <u>U</u>
              </button>
              <button
                type={'button'}
                onClick={() => {
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
                }}
                className={
                  'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')
                }
                aria-label="Format Strikethrough"
              >
                <s>S</s>
              </button>

              <button
                type={'button'}
                onClick={insertLink}
                className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
                aria-label="Insert Link"
              >
                <LinkIcon className={'h-4'} />
              </button>

              <ImageToolbarButton
                FilePicker={FilePicker}
                getPublicUrl={getPublicUrl}
              />

              <VerticalSeparator />

              <button
                type={'button'}
                onClick={() => alignText('left')}
                className={'toolbar-item spaced'}
                aria-label="Align Left"
              >
                <AlignLeft className={'h-4'} />
              </button>

              <button
                type={'button'}
                onClick={() => alignText('center')}
                className={'toolbar-item spaced'}
                aria-label="Align Center"
              >
                <AlignCenter className={'h-4'} />
              </button>

              <button
                type={'button'}
                onClick={() => alignText('right')}
                className={'toolbar-item spaced'}
                aria-label="Align Right"
              >
                <AlignRight className={'h-4'} />
              </button>

              <VerticalSeparator />

              <ColorPicker
                property={'color'}
                editor={editor}
                color={color}
                onOpenChange={(isBusy) => {
                  setEditorBusy(isBusy);

                  if (!isBusy) {
                    closeToolbar();
                  }
                }}
              >
                <BrushIcon />
              </ColorPicker>

              <ColorPicker
                property={'background-color'}
                editor={editor}
                color={backgroundColor}
                onOpenChange={(isBusy) => {
                  setEditorBusy(isBusy);

                  if (!isBusy) {
                    closeToolbar();
                  }
                }}
              >
                <PaintBucket />
              </ColorPicker>

              {isLink &&
                createPortal(
                  <FloatingLinkEditor editor={editor} />,
                  document.body,
                )}
            </If>
          }
        </div>
      </Portal>
    </>
  );
}

function usePointerInteractions() {
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isPointerReleased, setIsPointerReleased] = useState(true);

  useEffect(() => {
    const handlePointerUp = () => {
      setIsPointerDown(false);
      setIsPointerReleased(true);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    const handlePointerDown = () => {
      setIsPointerDown(true);
      setIsPointerReleased(false);
      document.addEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return { isPointerDown, isPointerReleased };
}

function positionEditorElement(
  editor: HTMLElement,
  rect: {
    top: number;
    left: number;
    height: number;
    width: number;
  } | null,
) {
  if (rect === null) {
    editor.style.opacity = '0';
    editor.style.top = '-1000px';
    editor.style.left = '-1000px';
  } else {
    editor.style.opacity = '1';
    editor.style.top = `${rect.top + rect.height + window.pageYOffset + 10}px`;
    editor.style.left = `${
      rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2
    }px`;
  }
}

function calculatePosition(ref: HTMLElement | null, isPointerDown: boolean) {
  const domSelection = getSelection();

  const domRange =
    domSelection?.rangeCount !== 0 && domSelection?.getRangeAt(0);

  if (!domRange || !ref || isPointerDown) {
    return Promise.reject(new Error('Invalid range or ref'));
  }

  return computePosition(domRange, ref, {
    middleware: [
      autoPlacement({
        rootBoundary: 'viewport',
        allowedPlacements: ['top-start', 'bottom-start'],
        padding: {
          top: 100,
          bottom: 100,
          left: 0,
        },
      }),
    ],
  });
}

function ColorPicker({
  property,
  color,
  editor,
  onOpenChange,
  className,
  children,
}: React.PropsWithChildren<{
  className?: string;
  property: string;
  color: string;
  editor: LexicalEditor;
  onOpenChange: (open: boolean) => void;
}>) {
  const subject$ = useMemo(() => new Subject<Record<string, string>>(), []);

  const [selection, setSelection] = useState<BaseSelection>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        setSelection(selection);
      } else {
        setOpen(false);
        onOpenChange(false);
      }
    });
  }, [editor, onOpenChange, open]);

  useEffect(() => {
    const subscription = subject$.pipe(debounceTime(10)).subscribe((styles) => {
      editor.update(() => {
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [editor, subject$, selection]);

  return (
    <>
      <button
        className={cn(className, 'toolbar-item spaced')}
        type={'button'}
        onClick={() => {
          setOpen(() => {
            const next = !open;

            onOpenChange(next);

            return next;
          });
        }}
      >
        {children}
      </button>

      <If condition={open}>
        <ChromePicker
          color={color}
          className={'fixed z-50'}
          onChange={(value) => {
            subject$.next({ [property]: value.hex });
          }}
        />

        <div
          className={'fixed inset-0 top-0 left-0 z-10 h-screen w-screen'}
          onClick={() => {
            setOpen(false);
            onOpenChange(false);
          }}
        />
      </If>
    </>
  );
}
