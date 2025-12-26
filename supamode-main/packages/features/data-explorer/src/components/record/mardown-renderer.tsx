import { lazy } from 'react';

import remarkGfm from 'remark-gfm';

const ReactMarkdown = lazy(() => import('react-markdown'));

export function MarkdownRenderer({ value }: { value: string }) {
  return (
    <div className="markdown max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt, title }) => (
            <MarkdownImageRenderer src={src} alt={alt} title={title} />
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Renders a markdown value as a formatted string
 * @param value - The markdown value to render
 * @returns A formatted string
 */
function MarkdownImageRenderer({
  src,
  alt,
  title,
}: {
  src?: string;
  alt?: string;
  title?: string;
}) {
  if (!src) return null;

  // Parse dimensions from title if present (format: "WIDTHxHEIGHT")
  let width: number | undefined;
  let height: number | undefined;

  if (title) {
    const dimensionMatch = title.match(/^(\d+)x(\d+)$/);

    if (dimensionMatch && dimensionMatch[1] && dimensionMatch[2]) {
      width = parseInt(dimensionMatch[1], 10);
      height = parseInt(dimensionMatch[2], 10);
    }
  }

  // Build style object
  const style: React.CSSProperties = {};

  if (width && height) {
    style.width = `${width}px`;
    style.height = `${height}px`;
    style.maxWidth = '100%'; // Responsive behavior
    style.height = 'auto'; // Maintain aspect ratio
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      style={style}
      className="h-auto max-w-full"
      loading="lazy"
      decoding="async"
    />
  );
}
