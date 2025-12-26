import type { NodeSelection, RangeSelection } from 'lexical';
import { $isRangeSelection } from 'lexical';

export function getHighlightedText(
  selection: RangeSelection | NodeSelection | null,
) {
  if (!selection) {
    return '';
  }

  const nodes = selection.getNodes() ?? [];

  let content = '';

  if (!selection || !$isRangeSelection(selection)) {
    return content;
  }

  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    const isAnchor = index === 0;
    const isFocus = index === nodes.length - 1;
    const anchorOffset = selection.anchor.offset;
    const focusOffset = selection.focus.offset;

    const textContent = node?.getTextContent() ?? '';

    if (isAnchor && isFocus) {
      content += textContent.substring(anchorOffset, focusOffset);

      continue;
    }

    if (isAnchor) {
      content += textContent.substring(anchorOffset);

      continue;
    }

    if (isFocus) {
      content += textContent.substring(0, focusOffset);

      continue;
    }

    content += textContent;
  }

  return content;
}
