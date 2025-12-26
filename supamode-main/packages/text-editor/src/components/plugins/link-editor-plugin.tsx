import { useCallback, useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isAtNodeEnd } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { BaseSelection, LexicalEditor, RangeSelection } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';

const LowRank = 1;

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

interface FloatingLinkEditorProps {
  editor: LexicalEditor;
  variant?: 'floating' | 'fixed';
}

export function FloatingLinkEditor({
  editor,
  variant = 'floating',
}: FloatingLinkEditorProps) {
  const editorRef = useRef<HTMLDivElement | null | undefined>(null);
  const inputRef = useRef<HTMLElement | null>(null);
  const mouseDownRef = useRef<boolean>(false);

  const [linkUrl, setLinkUrl] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [lastSelection, setLastSelection] = useState<BaseSelection | null>(
    null,
  );
  const [hasLink, setHasLink] = useState<boolean>(false);

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();

      if ($isLinkNode(parent)) {
        const url = parent.getURL();
        setLinkUrl(url);
        setHasLink(true);
        setIsEditMode(false);
      } else if ($isLinkNode(node)) {
        const url = node.getURL();
        setLinkUrl(url);
        setHasLink(true);
        setIsEditMode(false);
      } else {
        setLinkUrl('');
        setHasLink(false);
        setIsEditMode(false);
      }
    }

    // Position the editor for both variants - only when there's a link
    if (
      (variant === 'floating' || variant === 'fixed') &&
      $isRangeSelection(selection)
    ) {
      const editorElem = editorRef.current;
      const nativeSelection = window.getSelection();
      const activeElement = document.activeElement;

      if (editorElem === null || !nativeSelection) {
        return;
      }

      const rootElement = editor.getRootElement();
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLinkSelected = $isLinkNode(parent) || $isLinkNode(node);

      // Only position the editor if we're on a link node
      if (
        isLinkSelected &&
        selection !== null &&
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
        setLinkUrl('');
        setHasLink(false);
        setIsEditMode(false);
      }
    }

    return true;
  }, [editor, variant]);

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

  // For fixed variant, only show if there's a link
  if (variant === 'fixed' && !hasLink) {
    return null;
  }

  return createPortal(
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
          placeholder="Enter URL..."
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
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
            }
          }}
        />
      ) : (
        <>
          <div className="link-input relative">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditMode(true);
                }}
              >
                {url}
              </a>
            ) : (
              <span>{linkUrl || 'Enter URL...'}</span>
            )}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

export function LinkEditorPlugin({
  variant = 'floating',
}: {
  variant?: 'floating' | 'fixed';
}) {
  const [editor] = useLexicalComposerContext();

  return <FloatingLinkEditor editor={editor} variant={variant} />;
}
