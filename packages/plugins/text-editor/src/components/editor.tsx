'use client';

import { useMemo, useState } from 'react';

import { CodeHighlightNode, CodeNode } from '@lexical/code';
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
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { cn } from '@kit/ui/utils';

import {
  MENTION_NODE_MARKDOWN_TRANSFORMER,
  MentionNode,
} from './nodes/mention-node';
import { EditingPlugin } from './plugins/ai-editing-plugin';
import { AutocompletePlugin } from './plugins/autocomplete-plugin';
import { HistoryPlugin } from './plugins/history-plugin';
import { MagicToolbarPlugin } from './plugins/magic-toolbar/magic-toolbar-plugin';
import { ToolbarPlugin } from './plugins/toolbar-plugin';
import { LexicalTheme } from './theme';

const ALL_TRANSFORMERS = [...TRANSFORMERS, MENTION_NODE_MARKDOWN_TRANSFORMER];

export function TextEditor({
  content,
  onChange,
  children,
  className,
  containerClassName,
  placeholder,
}: React.PropsWithChildren<{
  className?: string;
  containerClassName?: string;
  content?: string;
  placeholder?: () => React.ReactElement;
  onChange?: (content: string) => void;
}>) {
  const editorConfig = useEditorConfig(content ?? '');

  const [_, setAnchorElementRef] = useState<HTMLDivElement | null>();

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className={cn(`relative flex flex-1 flex-col`, containerClassName)}
        ref={setAnchorElementRef}
      >
        <div className="relative h-full w-full flex-1 flex-col">
          <RichTextPlugin
            contentEditable={<Input className={className} />}
            placeholder={placeholder ?? <Placeholder />}
            ErrorBoundary={LexicalErrorBoundary}
          />

          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
          <MagicToolbarPlugin />
          <AutocompletePlugin />
          <EditingPlugin />
          <ToolbarPlugin />
          <HistoryPlugin />

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(_, editor) => {
              editor.update(() => {
                if (onChange) {
                  onChange($convertToMarkdownString(ALL_TRANSFORMERS));
                }
              });
            }}
          />

          {children}
        </div>
      </div>
    </LexicalComposer>
  );
}

function useEditorConfig(content: string) {
  return useMemo((): React.ComponentProps<
    typeof LexicalComposer
  >['initialConfig'] => {
    return {
      namespace: '',
      editorState: () => {
        return $convertFromMarkdownString(content, ALL_TRANSFORMERS);
      },
      onError(error: Error): void {
        console.error(error);
        throw error;
      },
      theme: LexicalTheme(),
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        AutoLinkNode,
        LinkNode,
        MentionNode,
      ],
    };
  }, [content]);
}

function Input(props: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-background absolute flex h-full w-full flex-1 flex-col overflow-y-auto rounded border p-8 pb-48 text-base font-medium shadow-xl transition-all lg:text-sm',
        props.className,
      )}
    >
      <ContentEditable className={'outline-none'} />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="text-muted-foreground user-select-none pointer-events-none absolute top-0 inline-block translate-x-1 items-center overflow-hidden p-8 align-middle leading-8 overflow-ellipsis">
      Press &quot;/&quot; to add a block
    </div>
  );
}
