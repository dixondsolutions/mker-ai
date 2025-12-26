import { useEffect } from 'react';

import { CodeNode } from '@lexical/code';
import {
  ShikiTokenizer,
  Tokenizer,
  registerCodeHighlighting,
} from '@lexical/code-shiki';
import { loadCodeTheme } from '@lexical/code-shiki';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalNode } from 'lexical';

const DarkThemeTokenizer: Tokenizer = {
  defaultLanguage: ShikiTokenizer.defaultLanguage,
  defaultTheme: 'dark-plus',
  $tokenize: (codeNode: CodeNode, language?: string): LexicalNode[] => {
    return ShikiTokenizer.$tokenize(codeNode, language);
  },
};

export function CodeHighlightShikiPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Load the dark theme
    loadCodeTheme('dark-plus');

    return registerCodeHighlighting(editor, DarkThemeTokenizer);
  }, [editor]);

  return null;
}
