import { useCallback, useEffect } from 'react';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import type { RangeSelection, TextNode } from 'lexical';
import { $setSelection, COMMAND_PRIORITY_LOW, createCommand } from 'lexical';

import { useAiEditing } from '../../lib/use-ai-editing';

export const EditCommand = createCommand(`AI_EDIT`);
export const EditCommandLoading = createCommand(`AI_EDIT_LOADING`);

export function EditingPlugin() {
  const [editor] = useLexicalComposerContext();
  const aiEditingMutation = useAiEditing();

  const onEditRequested = useCallback(
    async (params: {
      context: string;
      action: string;
      selection: RangeSelection;
      prompt?: string;
    }) => {
      const selection = params.selection;

      const nodes = selection.getNodes();
      const nodeText = nodes[0]?.getTextContent();

      editor.dispatchCommand(EditCommandLoading, {
        state: true,
        selection,
      });

      const text = await aiEditingMutation
        .mutateAsync({
          context: params.context,
          action: params.action,
        })
        .catch(() => {
          editor.dispatchCommand(EditCommandLoading, {
            state: false,
            selection,
          });
        });

      editor.update(() => {
        editor.dispatchCommand(EditCommandLoading, {
          state: false,
          selection,
        });

        if (!text) {
          return;
        }

        const newText = nodeText?.replace(params.context, text);

        if (!newText) {
          return;
        }

        const node = nodes[0] as TextNode;

        if (!node) {
          return;
        }

        node.setTextContent(newText);
      });
    },
    [aiEditingMutation, editor],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        EditCommand,
        (payload: {
          context: string;
          action: string;
          selection: RangeSelection;
          prompt?: string;
        }) => {
          void onEditRequested(payload);

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        EditCommandLoading,
        (payload: { state: boolean; selection: RangeSelection }, editor) => {
          const isLoading = payload.state;
          const root = editor.getRootElement();

          if (isLoading) {
            setNodesAsPending();
            document.addEventListener('scroll', setNodesAsNotPending);
          } else {
            setNodesAsNotPending();
            document.removeEventListener('scroll', setNodesAsNotPending);
          }

          if (root) {
            if (isLoading) {
              root.classList.add('pointer-events-none');
            } else {
              root.classList.remove('pointer-events-none');
              $setSelection(null);
            }
          }

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onEditRequested]);

  return null;
}

function setNodesAsPending() {
  const selection = window.getSelection();
  const getRange = selection?.getRangeAt(0);
  const rect = getRange?.getBoundingClientRect();

  if (rect) {
    const element = document.createElement('div');
    element.classList.add('absolute', 'animate-pulse', 'pending-node');
    element.style.backgroundColor = 'rgba(255,255,255,0.7)';
    element.style.top = `${rect.top}px`;
    element.style.left = `${rect.left}px`;
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;

    document.body.appendChild(element);
  }
}

function setNodesAsNotPending() {
  const pendingNodeDiv = document.querySelector('.pending-node');

  if (pendingNodeDiv) {
    pendingNodeDiv.remove();
  }
}
