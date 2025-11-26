import { memo } from 'react';

import Markdown from 'markdown-to-jsx';

import { cn } from '../../lib/utils';

const MemoizedReactMarkdown = memo(
  Markdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);

export function MarkdownRenderer(
  props: React.PropsWithChildren<{ className?: string; children: string }>,
) {
  return (
    <MemoizedReactMarkdown className={cn(props.className)}>
      {props.children}
    </MemoizedReactMarkdown>
  );
}
