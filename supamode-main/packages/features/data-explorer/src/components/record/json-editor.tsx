import { useCallback, useEffect, useState } from 'react';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { ControllerRenderProps, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { ExpandedOverlay } from './expanded-overlay';

// The minimum number of lines to show in the editor
const MIN_LINES = 16;

export function JsonEditor({
  field,
  placeholder,
}: {
  field: ControllerRenderProps;
  placeholder: string | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ExpandedOverlay
      expanded={expanded}
      setExpanded={setExpanded}
      className="max-w-4xl"
    >
      <JsonEditorContent field={field} />

      <If condition={!expanded}>
        <div className="relative mt-2 flex h-full w-full flex-col space-y-2.5">
          <div className="flex flex-col space-y-1">
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          </div>
        </div>
      </If>
    </ExpandedOverlay>
  );
}

function JsonEditorContent({ field }: { field: ControllerRenderProps }) {
  const { t } = useTranslation();
  const [id] = useState(() => `json-editor-${Math.random() * 100}`);
  const formContext = useFormContext();

  const setErrorContext = formContext.setError;
  const onChangeCallback = field.onChange;
  const error = formContext.formState.errors[field.name];

  const onErrorChange = useCallback(
    (error: boolean) => {
      setErrorContext(
        field.name,
        {
          type: 'custom',
          message: error ? t('dataExplorer:invalidJsonTitle') : undefined,
        },
        {
          shouldFocus: false,
        },
      );
    },
    [field.name, t, setErrorContext],
  );

  useEffect(() => {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    let isJSON: boolean;

    try {
      JSON.parse(JSON.stringify(field.value ?? '{}', null, 2));
      isJSON = true;
    } catch {
      isJSON = false;
      onErrorChange(true);
    }

    if (!isJSON) {
      return;
    }

    const updateListenerExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        try {
          const json = update.state.doc.toString();
          const data = JSON.parse(json);

          onChangeCallback(data);
          onErrorChange(false);
        } catch {
          // there's an error, so we don't update the value
          onErrorChange(true);
        }
      }
    });

    let data = field.value ? JSON.stringify(field.value, null, 2) : '';
    const lines = data.split('\n');

    if (lines.length < MIN_LINES) {
      data += '\n'.repeat(MIN_LINES - lines.length);
    }

    const editor = new EditorView({
      doc: data,
      parent: element,
      extensions: [
        // A line number gutter
        lineNumbers(),
        // A gutter with code folding markers
        foldGutter(),
        // Replace non-printable characters with placeholders
        highlightSpecialChars(),
        // The undo history
        history(),
        // editor theme
        vscodeDark,
        // Replace native cursor/selection with our own
        drawSelection(),
        // Show a drop cursor when dragging over the editor
        dropCursor(),
        // Allow multiple cursors/selections
        EditorState.allowMultipleSelections.of(true),
        // Re-indent lines when typing specific input
        indentOnInput(),
        indentUnit.of('  '),
        // JSON language
        json(),
        // Highlight syntax with a default style
        syntaxHighlighting(defaultHighlightStyle),
        // Highlight matching brackets near cursor
        bracketMatching(),
        // Automatically close brackets
        closeBrackets(),
        // Load the autocompletion system
        autocompletion(),
        // Allow alt-drag to select rectangular regions
        rectangularSelection(),
        // Change the cursor to a crosshair when holding alt
        crosshairCursor(),
        // Style the current line specially
        highlightActiveLine(),
        // Style the gutter for current line specially
        highlightActiveLineGutter(),
        // Highlight text that matches the selected text
        highlightSelectionMatches(),
        updateListenerExtension,
        keymap.of([
          // Closed-brackets aware backspace
          ...closeBracketsKeymap,
          // A large set of basic bindings
          ...defaultKeymap,
          // Search-related keys
          ...searchKeymap,
          // Redo/undo keys
          ...historyKeymap,
          // Code folding bindings
          ...foldKeymap,
          // Autocompletion keys
          ...completionKeymap,
          // Keys related to the linter system
          ...lintKeymap,
        ]),
      ],
    });

    return () => {
      editor.destroy();
    };
  }, [id, onErrorChange, onChangeCallback, field.value]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>
          <Trans i18nKey="dataExplorer:invalidJsonTitle" />
        </AlertTitle>

        <AlertDescription>
          <Trans
            i18nKey="dataExplorer:invalidJsonDescription"
            values={{ property: field.name }}
          />
        </AlertDescription>
      </Alert>
    );
  }

  return <div className={cn('h-full w-full')} id={id}></div>;
}
