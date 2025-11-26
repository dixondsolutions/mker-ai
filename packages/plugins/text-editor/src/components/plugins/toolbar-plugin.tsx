import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { autoPlacement, computePosition } from '@floating-ui/dom';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isAtNodeEnd } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { Portal } from '@radix-ui/react-portal';
import { BaseSelection, LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { LinkIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { cn } from '@kit/ui/utils';

import { EditCommand } from './ai-editing-plugin';
import { getHighlightedText } from './magic-toolbar/utils';

const LowPriority = 1;

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
        LowPriority,
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
                if (linkUrl !== '') {
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
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {linkUrl}
            </a>
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

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const customPromptModalRef = useRef<HTMLDivElement>(null);

  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [, setIsCode] = useState(false);
  const { isPointerDown, isPointerReleased } = usePointerInteractions();

  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const [customPromptCoords, setCustomPromptCoords] = useState({ x: 0, y: 0 });

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
        closeToolbar();
      });
  }, [isPointerDown, closeToolbar]);

  const $handleSelectionChange = useCallback(() => {
    if (
      editor.isComposing() ||
      editor.getRootElement() !== document.activeElement ||
      isVisible
    ) {
      return closeToolbar();
    }

    const selection = $getSelection();

    if ($isRangeSelection(selection) && !selection.anchor.is(selection.focus)) {
      calculateToolbarPosition();
    } else {
      closeToolbar();
    }
  }, [editor, calculateToolbarPosition, isVisible, closeToolbar]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => $handleSelectionChange());
    });
  }, [editor, $handleSelectionChange]);

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
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

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
        LowPriority,
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

  return (
    <>
      <Portal>
        <div
          hidden={!isVisible}
          className={cn(`toolbar absolute`, {
            flex: isVisible,
          })}
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

              {isLink &&
                createPortal(
                  <FloatingLinkEditor editor={editor} />,
                  document.body,
                )}
            </If>
          }
        </div>
      </Portal>

      <Portal>
        <CustomPromptModalForm
          innerRef={customPromptModalRef}
          editor={editor}
          customPromptCoords={customPromptCoords}
          setCustomPromptCoords={setCustomPromptCoords}
        />
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

function CustomPromptModalForm({
  innerRef,
  editor,
  customPromptCoords,
  setCustomPromptCoords,
}: React.PropsWithChildren<{
  innerRef: MutableRefObject<HTMLDivElement | undefined | null>;
  editor: LexicalEditor;
  customPromptCoords: { x: number; y: number };
  setCustomPromptCoords: (coords: { x: number; y: number }) => void;
}>) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      prompt: '',
    },
  });

  const isCustomPromptModalOpen = Boolean(
    customPromptCoords.x && customPromptCoords.y,
  );

  return (
    <div
      ref={(ref) => {
        innerRef.current = ref;
      }}
      className={cn(
        `bg-background absolute z-50 rounded-xl border p-4 shadow-xl`,
        {
          hidden: !isCustomPromptModalOpen,
        },
      )}
      style={{
        left: customPromptCoords.x,
        top: customPromptCoords.y,
      }}
    >
      <form
        className="flex flex-col space-y-2"
        onSubmit={handleSubmit(({ prompt }) => {
          editor.update(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection)) {
              return;
            }

            const context = getHighlightedText(selection);

            editor.dispatchCommand(EditCommand, {
              action: 'custom',
              selection,
              prompt,
              context,
            });

            setCustomPromptCoords({ x: 0, y: 0 });
          });
        })}
      >
        <Heading level={4}>Ask AI</Heading>

        <div className="flex flex-col space-y-4">
          <Label className={'flex flex-col space-y-2'}>
            <span>Use your custom prompt to ask AI for suggestions.</span>
            <Textarea
              required
              autoFocus
              placeholder="Ex. Translate to French..."
              {...register('prompt', {
                required: true,
              })}
            />
          </Label>

          <div className="flex justify-end space-x-2.5">
            <Button
              variant="outline"
              onClick={() =>
                setCustomPromptCoords({
                  x: 0,
                  y: 0,
                })
              }
            >
              Cancel
            </Button>

            <Button>Ask AI</Button>
          </div>
        </div>
      </form>
    </div>
  );
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
