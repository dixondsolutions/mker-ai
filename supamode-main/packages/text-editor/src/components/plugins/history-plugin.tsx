import { useEffect } from 'react';

import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

export function HistoryPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerHistory(editor, createEmptyHistoryState(), 50);
  }, [editor]);

  return null;
}
