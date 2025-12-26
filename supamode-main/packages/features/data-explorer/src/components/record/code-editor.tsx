import { useEffect, useEffectEvent, useState } from 'react';

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
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

import { cn } from '@kit/ui/utils';

const MIN_LINES = 16;

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'markdown' | 'json';
  className?: string;
  minLines?: number;
  readOnly?: boolean;
}

/**
 * Reusable CodeMirror editor component supporting HTML, Markdown, and JSON
 */
export function CodeEditor({
  value,
  onChange,
  language,
  className,
  minLines = MIN_LINES,
  readOnly = false,
}: CodeEditorProps) {
  const [id] = useState(() => `code-editor-${Math.random() * 100000}`);

  const createEditor = useEffectEvent(() => {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    // Create update listener that triggers onChange (only if not read-only)
    const updateListenerExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged && !readOnly) {
        const content = update.state.doc.toString();

        onChange(content);
      }
    });

    // Select language extension based on prop
    const languageExtension = (() => {
      switch (language) {
        case 'html':
          return html();
        case 'markdown':
          return markdown();
        case 'json':
          return json();
        default:
          return markdown();
      }
    })();

    // Prepare document content with minimum lines
    let doc = value || '';
    const lines = doc.split('\n');

    if (lines.length < minLines) {
      doc += '\n'.repeat(minLines - lines.length);
    }

    // Create CodeMirror editor instance
    return new EditorView({
      doc,
      parent: element,
      extensions: [
        // Line numbers gutter
        lineNumbers(),
        // Code folding gutter
        foldGutter(),
        // Replace non-printable characters with placeholders
        highlightSpecialChars(),
        // Undo/redo history
        history(),
        // VSCode dark theme
        vscodeDark,
        // Custom cursor/selection rendering
        drawSelection(),
        // Drop cursor when dragging
        dropCursor(),
        // Multiple cursors/selections
        EditorState.allowMultipleSelections.of(true),
        // Auto-indent on input
        indentOnInput(),
        indentUnit.of('  '),
        // Language-specific syntax
        languageExtension,
        // Syntax highlighting
        syntaxHighlighting(defaultHighlightStyle),
        // Bracket matching
        bracketMatching(),
        // Auto-close brackets
        closeBrackets(),
        // Autocompletion
        autocompletion(),
        // Rectangular selection with alt-drag
        rectangularSelection(),
        // Crosshair cursor when holding alt
        crosshairCursor(),
        // Highlight active line
        highlightActiveLine(),
        highlightActiveLineGutter(),
        // Highlight matching selections
        highlightSelectionMatches(),
        // Update listener for onChange
        updateListenerExtension,
        // Read-only mode if specified
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        // Key bindings
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
      ],
    });
  });

  useEffect(() => {
    const editor = createEditor();

    return () => {
      editor?.destroy();
    };
  }, []);

  return <div className={cn('size-full', className)} id={id}></div>;
}
