import { Suspense } from 'react';

import type { BundledLanguage, Highlighter } from 'shiki';

import { Spinner } from './spinner';

let highlighter: Highlighter;

interface Props {
  children: string;
  lang: BundledLanguage;
}

/**
 * The theme to use for the code block.
 *
 * @see https://shiki.matsu.io/themes
 */
const THEME = 'dark-plus';

export function CodeBlock(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CodeBlockContent {...props} />
    </Suspense>
  );
}

function CodeBlockContent(props: Props) {
  if (!highlighter) {
    throw createShikiHighlighter([props.lang]);
  }

  const html = highlighter.codeToHtml(props.children, {
    lang: props.lang,
    theme: THEME,
    transformers: [
      {
        pre(node) {
          this.addClassToHast(
            node,
            'p-4 font-mono text-sm max-w-full whitespace-pre-wrap break-words',
          );
        },
      },
    ],
  });

  return <div className="w-full" dangerouslySetInnerHTML={{ __html: html }} />;
}

async function createShikiHighlighter(languages: string[]) {
  const { createHighlighter } = await import('shiki');

  highlighter = await createHighlighter({
    langs: ['json'],
    themes: [THEME],
  });

  const promises = languages.map((language) =>
    highlighter.loadLanguage(language as BundledLanguage),
  );

  await Promise.all(promises);

  return highlighter;
}
