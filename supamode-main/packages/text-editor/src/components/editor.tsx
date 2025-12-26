'use client';

import { useMemo, useState } from 'react';

import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { $insertNodes, LexicalEditor, RangeSelection } from 'lexical';
import { ControllerRenderProps } from 'react-hook-form';

import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import {
  HR_TRANSFORMER,
  IMAGE_TRANSFORMER,
  TABLE_TRANSFORMER,
} from '../transformers';
import { ImageNode } from './nodes/image-node';
import { CodeLanguageSwitcherPlugin } from './plugins/code-language-switcher-plugin';
import { CodeHighlightShikiPlugin } from './plugins/code-shiki';
import { FixedToolbarPlugin } from './plugins/fixed-toolbar-plugin';
import { HistoryPlugin } from './plugins/history-plugin';
import { MagicToolbarPlugin } from './plugins/magic-toolbar/magic-toolbar-plugin';
import { LexicalTheme } from './theme';

// Use the original transformers but ensure our image transformer is first
const ALL_TRANSFORMERS = [
  IMAGE_TRANSFORMER,
  TABLE_TRANSFORMER,
  HR_TRANSFORMER,
  ...TRANSFORMERS,
];

const EDITOR_NODES = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  HorizontalRuleNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  AutoLinkNode,
  LinkNode,
  ImageNode,
];

export function TextEditor({
  content,
  onChange,
  children,
  inputClassName = '',
  className,
  containerClassName,
  type,
  FilePicker,
  getPublicUrl,
}: React.PropsWithChildren<{
  className?: string;
  containerClassName?: string;
  content?: string;
  inputClassName?: string;
  placeholder?: () => React.ReactElement;
  onChange?: (content: string) => void;
  type: 'html' | 'markdown';
  FilePicker?: React.ComponentType<{
    field: ControllerRenderProps;
    defaultOpen?: boolean;
  }>;
  getPublicUrl?: (filePath: string) => string;
}>) {
  const editorConfig = useEditorConfig(content ?? '', type);
  const [_, setAnchorElementRef] = useState<HTMLDivElement | null>();

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className={cn(
          `relative flex flex-1 flex-col rounded-lg`,
          containerClassName,
        )}
        ref={setAnchorElementRef}
      >
        <div
          className={cn(
            'relative h-full w-full flex-1 flex-col rounded-t border',
            className,
          )}
        >
          <FixedToolbarPlugin
            FilePicker={FilePicker}
            getPublicUrl={getPublicUrl}
          />

          <MagicToolbarPlugin />
          <CodeHighlightShikiPlugin />
          <CodeLanguageSwitcherPlugin />

          <RichTextPlugin
            contentEditable={
              <>
                <Input className={inputClassName} />
              </>
            }
            placeholder={
              <div className="absolute top-14 w-full px-4">
                <Placeholder />
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />

          <HorizontalRulePlugin />

          <TablePlugin />

          <HistoryPlugin />

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState, editor) => {
              if (!onChange) {
                return;
              }

              editorState.read(() => {
                onChange(exportContentFromEditorState(editor, type, null));
              });
            }}
          />

          {children}
        </div>
      </div>
    </LexicalComposer>
  );
}

/**
 * Use editor config
 * @param content - The content to import
 * @param type - The type of content to import
 * @returns The editor config
 */
function useEditorConfig(content: string, type: 'html' | 'markdown') {
  return useMemo((): React.ComponentProps<
    typeof LexicalComposer
  >['initialConfig'] => {
    return {
      namespace: '',
      editorState: content
        ? () => importContentToEditorState(null, content, type)
        : undefined,
      onError(error: Error): void {
        console.error(error);
        throw error;
      },
      theme: LexicalTheme(),
      nodes: EDITOR_NODES,
    };
  }, [content, type]);
}

/**
 * Export content from editor state
 * @param editor - The editor instance
 * @param type - The type of content to export
 * @param selection - The selection to export
 * @returns The exported content
 */
function exportContentFromEditorState(
  editor: LexicalEditor,
  type: 'html' | 'markdown',
  selection: RangeSelection | null,
) {
  switch (type) {
    case 'html':
      return $generateHtmlFromNodes(editor, selection);

    case 'markdown':
      return $convertToMarkdownString(ALL_TRANSFORMERS);
  }

  throw new Error('Invalid content type');
}

/**
 * Import content to editor state
 * @param editor - The editor instance
 * @param content - The content to import
 * @param type - The type of content to import
 * @returns The editor state
 */
function importContentToEditorState(
  editor: LexicalEditor | null,
  content: string,
  type: 'html' | 'markdown',
) {
  if (type === 'html' && editor) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(content, 'text/html');

    const nodes = $generateNodesFromDOM(editor, dom);

    $insertNodes(nodes);
  } else if (type === 'markdown') {
    // Convert markdown string to editor state and return it
    // This properly handles all transformers including images
    return $convertFromMarkdownString(content, ALL_TRANSFORMERS);
  }
}

/**
 * Input component for the editor
 * @param props - The props for the input component
 * @returns The input component
 */
function Input(props: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-background text-secondary-foreground flex h-full w-full flex-1 flex-col overflow-y-auto border border-transparent px-4 text-base font-medium transition-all lg:text-sm',
        props.className,
      )}
    >
      <ContentEditable className={'outline-none'} />
    </div>
  );
}

/**
 * Placeholder component for the editor
 * @returns The placeholder component
 */
function Placeholder() {
  return (
    <div className="text-muted-foreground user-select-none pointer-events-none absolute top-0 inline-block translate-x-1 items-center overflow-hidden py-2 align-middle leading-8 overflow-ellipsis">
      <Trans i18nKey={'dataExplorer:richTextEditorPlaceholder'} />
    </div>
  );
}
