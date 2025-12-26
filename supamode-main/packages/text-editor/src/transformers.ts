import { ElementTransformer, TextMatchTransformer } from '@lexical/markdown';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $isParagraphNode,
  $isTextNode,
  ElementNode,
  LexicalNode,
} from 'lexical';

import {
  $createImageNode,
  $isImageNode,
  ImageNode,
} from './components/nodes/image-node';

export const HR_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    // TODO: Get rid of isImport flag
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element',
};

// Very primitive table setup
const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_DIVIDER_CELL_REG_EXP = /^\s*:?-{3,}:?\s*$/;

export const TABLE_TRANSFORMER: ElementTransformer = {
  // TODO: refactor transformer for new TableNode
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (
    node: LexicalNode,
    exportChildren: (elementNode: ElementNode) => string,
  ) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const rows: string[][] = [];
    let maxColumns = 0;

    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) {
        continue;
      }

      const cellsInRow = row
        .getChildren()
        .filter((child) => $isTableCellNode(child)) as TableCellNode[];

      maxColumns = Math.max(maxColumns, cellsInRow.length);
      rows.push(cellsInRow.map((cell) => exportChildren(cell)));
    }

    if (rows.length === 0) {
      return null;
    }

    const lines: string[] = [];

    rows.forEach((row, rowIndex) => {
      const normalized = [...row];
      while (normalized.length < maxColumns) {
        normalized.push('');
      }

      if (rowIndex === 0) {
        lines.push(`| ${normalized.join(' | ')} |`);
        const divider = normalized.map(() => '---');
        lines.push(`| ${divider.join(' | ')} |`);
        return;
      }

      lines.push(`| ${normalized.join(' | ')} |`);
    });

    return lines.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    const matchCells = mapToTableCells(match[0]!);

    if (matchCells == null) {
      return;
    }

    const rows = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    let nextSibling = parentNode.getNextSibling();

    while (nextSibling) {
      if (!$isParagraphNode(nextSibling)) {
        break;
      }

      if (nextSibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = nextSibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.push(cells);
      const followingSibling = nextSibling.getNextSibling();
      nextSibling.remove();
      nextSibling = followingSibling;
    }

    if (rows.length > 1) {
      const possibleDivider = rows[1];

      if (!possibleDivider) {
        return;
      }

      const isDividerRow = possibleDivider.every((cell) => {
        const text = cell.getTextContent().trim();
        return TABLE_DIVIDER_CELL_REG_EXP.test(text);
      });

      if (isDividerRow) {
        rows.splice(1, 1);
      }
    }

    const table = $createTableNode();

    const rowsToRender = rows.filter((cells) => {
      return !cells.every((cell) =>
        TABLE_DIVIDER_CELL_REG_EXP.test(cell.getTextContent().trim()),
      );
    });

    rowsToRender.forEach((cells) => {
      const tableRow = $createTableRowNode();

      for (let i = 0; i < maxCells; i++) {
        const originalCell = i < cells.length ? cells[i]! : null;
        const newCell = $createTableCellNode();

        if (originalCell) {
          const childNodes = originalCell.getChildren();
          childNodes.forEach((child) => {
            newCell.append(child);
          });
        } else {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(''));
          newCell.append(paragraph);
        }

        tableRow.append(newCell);
      }

      table.append(tableRow);
    });

    const previousSibling = parentNode.getPreviousSibling();
    if (
      $isTableNode(previousSibling) &&
      getTableColumnsSize(previousSibling) === maxCells
    ) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
      normalizeTableHeaderStates(previousSibling);
      previousSibling.selectEnd();
      return;
    }

    normalizeTableHeaderStates(table);
    parentNode.replace(table);
    table.selectEnd();
  },
  type: 'element',
};

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const createTableCell = (
  textContent: string | null | undefined,
  headerState = TableCellHeaderStates.NO_STATUS,
): TableCellNode => {
  const cell = $createTableCellNode(headerState);
  const paragraph = $createParagraphNode();

  if (textContent != null) {
    paragraph.append($createTextNode(textContent.trim()));
  }

  cell.append(paragraph);
  return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  // TODO:
  // For now plain text, single node. Can be expanded to more complex content
  // including formatted text
  const match = textContent.match(TABLE_ROW_REG_EXP);

  if (!match || !match[1]) {
    return null;
  }

  return match[1].split('|').map((text) => createTableCell(text));
};

function normalizeTableHeaderStates(table: TableNode) {
  let row = table.getFirstChild();
  let rowIndex = 0;

  while ($isTableRowNode(row)) {
    const isHeader = rowIndex === 0;

    row
      .getChildren()
      .filter($isTableCellNode)
      .forEach((cell) => {
        cell.setHeaderStyles(
          isHeader
            ? TableCellHeaderStates.ROW
            : TableCellHeaderStates.NO_STATUS,
          TableCellHeaderStates.BOTH,
        );
      });

    row = row.getNextSibling();
    rowIndex += 1;
  }
}

// Image transformer for markdown support with dimensions
export const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }

    const altText = node.getAltText();
    const src = node.getSrc();
    const width = node.getWidth();
    const height = node.getHeight();

    // If dimensions are set and not 'inherit', include them in the title
    if (
      width !== 'inherit' &&
      height !== 'inherit' &&
      width !== 0 &&
      height !== 0
    ) {
      return `![${altText}](${src} "${Math.round(width)}x${Math.round(height)}")`;
    }

    return `![${altText}](${src})`;
  },
  /* eslint-disable-next-line no-useless-escape */
  importRegExp: /!\[([^\[\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)/,
  /* eslint-disable-next-line no-useless-escape */
  regExp: /!\[([^\[\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)$/,
  replace: (textNode, match) => {
    if (!match || match.length < 3) {
      console.error('Invalid match format:', match);
      return;
    }

    const [, altText, src, title] = match;

    if (!src) {
      console.error('No src found in match:', match);
      return;
    }

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

    const imageNode = $createImageNode({
      altText: altText || '',
      maxWidth: 500,
      src: src || '',
      width,
      height,
    });

    textNode.replace(imageNode);
  },
  trigger: ')',
  type: 'text-match',
};
