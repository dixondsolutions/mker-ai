import { useCallback, useEffect, useRef } from 'react';

import { useCompletion } from '@ai-sdk/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  createCommand,
} from 'lexical';

export const AutocompleteCommand = createCommand(`AI_AUTOCOMPLETE`);

export const AutocompleteCommandLoading = createCommand(
  `AI_AUTOCOMPLETE_LOADING`,
);

export const AutocompleteCommandError = createCommand(`AI_AUTOCOMPLETE_ERROR`);
export const AutocompleteCommandStop = createCommand(`AI_AUTOCOMPLETE_STOP`);

const AUTOCOMPLETE_ENDPOINT =
  process.env.NEXT_PUBLIC_AUTOCOMPLETE_ENDPOINT ?? `/api/editor/autocomplete`;

export function AutocompletePlugin() {
  const [editor] = useLexicalComposerContext();
  const previousCompletionRef = useRef<string>(null);

  const { stop, complete, completion, isLoading } = useCompletion({
    api: AUTOCOMPLETE_ENDPOINT,
    onError() {
      editor.dispatchCommand(AutocompleteCommandError, {});

      editor.dispatchCommand(AutocompleteCommandLoading, {
        state: false,
      });
    },
    onFinish() {
      editor.dispatchCommand(AutocompleteCommandLoading, {
        state: false,
      });
    },
  });

  const onAutocompleteRequested = useCallback(
    async (context: string) => {
      editor.dispatchCommand(AutocompleteCommandLoading, {
        state: true,
      });

      // we call the OpenAI API to get a completion
      await complete(context);
    },
    [complete, editor],
  );

  useEffect(() => {
    const substring = completion?.substring(
      previousCompletionRef.current?.length ?? 0,
    );

    previousCompletionRef.current = completion;

    if (substring) {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          selection.insertText(substring);
        }
      });
    }
  }, [completion, editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (isLoading) {
          editor.dispatchCommand(AutocompleteCommandStop, {});
        }

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, isLoading]);

  useEffect(() => {
    return editor.registerCommand(
      AutocompleteCommand,
      (payload: { context: string }) => {
        void onAutocompleteRequested(payload.context);

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onAutocompleteRequested]);

  useEffect(() => {
    return editor.registerCommand(
      AutocompleteCommandStop,
      () => {
        stop();

        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, stop]);

  return null;
}
