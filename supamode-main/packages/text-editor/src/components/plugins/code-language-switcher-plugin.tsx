import { useCallback, useEffect, useState } from 'react';

import { $isCodeNode } from '@lexical/code';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $getSelection, $isRangeSelection } from 'lexical';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

const CODE_LANGUAGES = [
  ['plain', 'Plain Text'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['css', 'CSS'],
  ['html', 'HTML'],
  ['java', 'Java'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['typescript-jsx', 'TypeScript JSX'],
  ['json', 'JSON'],
  ['markdown', 'Markdown'],
  ['python', 'Python'],
  ['rust', 'Rust'],
  ['sql', 'SQL'],
  ['tsx', 'TypeScript JSX'],
  ['ts', 'TypeScript'],
  ['xml', 'XML'],
] as const;

export function CodeLanguageSwitcherPlugin() {
  const [editor] = useLexicalComposerContext();
  const [codeNodeKey, setCodeNodeKey] = useState<string | null>(null);
  const [language, setLanguage] = useState('plain');

  const updateCodeLanguage = useCallback(
    (newLanguage: string) => {
      editor.update(() => {
        if (codeNodeKey) {
          const node = $getNodeByKey(codeNodeKey);

          if ($isCodeNode(node)) {
            // Set empty string for 'plain' to remove syntax highlighting
            node.setLanguage(newLanguage === 'plain' ? '' : newLanguage);
          }
        }
      });
    },
    [editor, codeNodeKey],
  );

  useEffect(() => {
    function updateCodeLanguageState() {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();

          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : anchorNode.getTopLevelElementOrThrow();

          const elementKey = element.getKey();
          const elementDOM = editor.getElementByKey(elementKey);

          if (elementDOM !== null) {
            if ($isCodeNode(element)) {
              setCodeNodeKey(elementKey);

              const lang = element.getLanguage();

              // Map empty string to 'plain' for the select component
              setLanguage(lang || 'plain');

              return;
            }
          }
        }

        setCodeNodeKey(null);
        setLanguage('plain');
      });
    }

    return editor.registerUpdateListener(updateCodeLanguageState);
  }, [editor]);

  if (!codeNodeKey) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 z-10">
      <Select
        value={language}
        onValueChange={updateCodeLanguage}
        defaultValue="plain"
      >
        <SelectTrigger className="bg-background/80 h-8 w-40 backdrop-blur-sm">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>

        <SelectContent>
          {CODE_LANGUAGES.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
