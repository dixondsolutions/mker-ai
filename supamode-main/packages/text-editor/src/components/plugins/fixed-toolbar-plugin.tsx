import { useCallback, useEffect, useMemo, useState } from 'react';

import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  INSERT_TABLE_COMMAND,
} from '@lexical/table';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  BaseSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  LexicalEditor,
} from 'lexical';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  PaintBucket,
  Paintbrush,
  Quote,
  Smile,
  Strikethrough,
  Table as TableIcon,
  Type,
  Underline,
} from 'lucide-react';
import { ChromePicker } from 'react-color';
import { ControllerRenderProps } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Subject, debounceTime } from 'rxjs';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { ImageToolbarButton } from './image-plugin';
import { LinkEditorPlugin } from './link-editor-plugin';

const LowRank = 1;

const blockTypeToBlockName = {
  paragraph: 'Normal',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  quote: 'Quote',
  horizontalrule: 'Horizontal Rule',
  table: 'Table',
  bullet: 'Bulleted List',
  number: 'Numbered List',
};

const HEADING_OPTIONS: Array<{ value: HeadingTagType; label: string }> = [
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

function isHeadingValue(value: string): value is HeadingTagType {
  return HEADING_OPTIONS.some((option) => option.value === value);
}

const EMOJI_OPTIONS = [
  '\u{1F600}', // grinning face
  '\u{1F603}', // smiling face
  '\u{1F604}', // beaming face
  '\u{1F60A}', // smiling face with smiling eyes
  '\u{1F60D}', // heart eyes
  '\u{1F606}', // laughing
  '\u{1F609}', // wink
  '\u{1F60E}', // cool
  '\u{1F642}', // slight smile
  '\u{1F61B}', // cheeky tongue
  '\u{1F60F}', // smirk
  '\u{1F914}', // thinking
  '\u{1F622}', // crying
  '\u{1F62D}', // sobbing
  '\u{1F44D}', // thumbs up
  '\u{1F44E}', // thumbs down
  '\u{1F44F}', // applause
  '\u{1F64C}', // raised hands
  '\u{1F64F}', // folded hands
  '\u{1F525}', // fire
  '\u{2728}', // sparkles
  '\u{1F680}', // rocket
  '\u{1F4A1}', // light bulb
  '\u{1F389}', // party popper
  '\u{2705}', // check mark
  '\u{274C}', // cross mark
  '\u{2764}\u{FE0F}', // red heart
] as const;

const DEFAULT_TABLE_ROWS = '3';
const DEFAULT_TABLE_COLUMNS = '3';
const MAX_TABLE_DIMENSION = 12;

function parseTableDimension(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, MAX_TABLE_DIMENSION);
}

function sanitizeDimensionInput(value: string): string {
  const digitsOnly = value.replace(/[^0-9]/g, '');

  if (digitsOnly === '') {
    return '';
  }

  const parsed = Number.parseInt(digitsOnly, 10);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  if (parsed < 1) {
    return '';
  }

  return String(Math.min(parsed, MAX_TABLE_DIMENSION));
}

function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();

  if (anchorNode === focusNode) {
    return anchorNode;
  }

  const isBackward = selection.isBackward();

  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function $isAtNodeEnd(point: any) {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }
  return point.offset === point.getNode().getChildrenSize();
}

interface FixedToolbarPluginProps {
  FilePicker?: React.ComponentType<{
    field: ControllerRenderProps;
    defaultOpen?: boolean;
  }>;
  getPublicUrl?: (filePath: string) => string;
}

export function FixedToolbarPlugin({
  FilePicker,
  getPublicUrl,
}: FixedToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslation('textEditor');

  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [color, setColor] = useState('#000');
  const [backgroundColor, setBackgroundColor] = useState('#fff');
  const [isInTable, setIsInTable] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRowsInput, setTableRowsInput] = useState(DEFAULT_TABLE_ROWS);
  const [tableColumnsInput, setTableColumnsInput] = useState(
    DEFAULT_TABLE_COLUMNS,
  );
  const [tableIncludeHeader, setTableIncludeHeader] = useState(true);

  const headingValue = useMemo<HeadingTagType | undefined>(() => {
    return HEADING_OPTIONS.some((option) => option.value === blockType)
      ? (blockType as HeadingTagType)
      : undefined;
  }, [blockType]);

  const tableRows = useMemo(
    () => parseTableDimension(tableRowsInput),
    [tableRowsInput],
  );

  const tableColumns = useMemo(
    () => parseTableDimension(tableColumnsInput),
    [tableColumnsInput],
  );

  const isTableConfigValid = tableRows !== null && tableColumns !== null;

  const resetTableDialog = useCallback(() => {
    setTableRowsInput(DEFAULT_TABLE_ROWS);
    setTableColumnsInput(DEFAULT_TABLE_COLUMNS);
    setTableIncludeHeader(true);
  }, []);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const textColor = $getSelectionStyleValueForProperty(
        selection,
        'color',
        '#000',
      );

      const backgroundColor = $getSelectionStyleValueForProperty(
        selection,
        'backgroundColor',
        '#fff',
      );

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      setColor(textColor);
      setBackgroundColor(backgroundColor);

      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && parent.getKey() === 'root';
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $findMatchingParent(
            anchorNode,
            (parent) =>
              $isListNode(parent) && parent.getParent()?.getKey() === 'root',
          ) as ListNode | null;
          const type = parentList
            ? parentList.getListType()
            : (element as ListNode).getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }

      const node = getSelectedNode(selection);
      const parent = node.getParent();

      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
      setIsInTable(tableCellNode !== null);
    } else {
      setIsInTable(false);
    }
  }, [editor, setIsCode]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload) => {
          updateToolbar();
          return false;
        },
        LowRank,
      ),
    );
  }, [editor, updateToolbar]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const alignText = useCallback(
    (value: `left` | `center` | `right`) => {
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value);
    },
    [editor],
  );

  const formatHeading = useCallback(
    (headingSize: HeadingTagType) => {
      if (blockType !== headingSize) {
        editor.update(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }

          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        });
      }
    },
    [blockType, editor],
  );

  const formatParagraph = useCallback(() => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        $setBlocksType(selection, () => $createParagraphNode());
      });
    }
  }, [blockType, editor]);

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      if (blockType === 'quote') {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }

      $setBlocksType(selection, () => $createQuoteNode());
    });
  }, [blockType, editor]);

  const formatBulletList = useCallback(() => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  }, [blockType, editor]);

  const formatNumberedList = useCallback(() => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  }, [blockType, editor]);

  const runTableUpdate = useCallback(
    (handler: (selection: RangeSelection) => void) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        handler(selection);
      });

      editor.focus();
    },
    [editor],
  );

  const insertRowAbove = useCallback(() => {
    runTableUpdate(() => {
      $insertTableRowAtSelection(false);
    });
  }, [runTableUpdate]);

  const insertRowBelow = useCallback(() => {
    runTableUpdate(() => {
      $insertTableRowAtSelection(true);
    });
  }, [runTableUpdate]);

  const insertColumnLeft = useCallback(() => {
    runTableUpdate(() => {
      $insertTableColumnAtSelection(false);
    });
  }, [runTableUpdate]);

  const insertColumnRight = useCallback(() => {
    runTableUpdate(() => {
      $insertTableColumnAtSelection(true);
    });
  }, [runTableUpdate]);

  const deleteRow = useCallback(() => {
    runTableUpdate(() => {
      $deleteTableRowAtSelection();
    });
  }, [runTableUpdate]);

  const deleteColumn = useCallback(() => {
    runTableUpdate(() => {
      $deleteTableColumnAtSelection();
    });
  }, [runTableUpdate]);

  const deleteTable = useCallback(() => {
    runTableUpdate((selection) => {
      const tableCell = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode(),
      );
      if (!tableCell) {
        return;
      }

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCell);
      const paragraph = $createParagraphNode();
      tableNode.insertAfter(paragraph);
      tableNode.remove();
      paragraph.select();
    });
  }, [runTableUpdate]);

  const handleTableDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsTableDialogOpen(open);

      if (!open) {
        resetTableDialog();
      }
    },
    [resetTableDialog],
  );

  const openTableDialog = useCallback(() => {
    resetTableDialog();
    setIsTableDialogOpen(true);
  }, [resetTableDialog]);

  const insertHorizontalRule = useCallback(() => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    editor.focus();
  }, [editor]);

  const handleCreateTable = useCallback(() => {
    if (!isTableConfigValid || tableRows === null || tableColumns === null) {
      return;
    }

    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: String(tableColumns),
      rows: String(tableRows),
      includeHeaders: tableIncludeHeader
        ? { rows: true, columns: false }
        : false,
    });

    handleTableDialogOpenChange(false);
    editor.focus();
  }, [
    editor,
    handleTableDialogOpenChange,
    isTableConfigValid,
    tableColumns,
    tableIncludeHeader,
    tableRows,
  ]);

  return (
    <>
      <div className="bg-background sticky top-0 z-10 flex items-center gap-0.5 rounded-t border-b px-1 py-1">
        <Button
          type="button"
          variant={blockType === 'paragraph' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={formatParagraph}
          aria-label="Normal Text"
        >
          <Type className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isBold ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
          aria-label="Format Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isItalic ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
          aria-label="Format Italics"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isUnderline ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
          aria-label="Format Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isStrikethrough ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
          }}
          aria-label="Format Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isLink ? 'secondary' : 'ghost'}
          size="icon"
          onClick={insertLink}
          aria-label="Insert Link"
        >
          <Link className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Select
          value={headingValue}
          onValueChange={(value) => {
            if (!isHeadingValue(value)) {
              return;
            }

            formatHeading(value);
          }}
        >
          <SelectTrigger className="text-muted-foreground bg-muted data-[placeholder]:!bg-background h-8 w-28">
            <SelectValue placeholder="Heading" />
          </SelectTrigger>

          <SelectContent>
            {HEADING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={insertHorizontalRule}
          aria-label="Insert Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={blockType === 'quote' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={formatQuote}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 px-2"
          onClick={openTableDialog}
          aria-label={t('table.insertTableButton', {
            defaultValue: 'Insert table',
          })}
        >
          <TableIcon className="h-4 w-4" />

          <span className="hidden sm:inline">
            <Trans
              i18nKey="textEditor:table.insertTableButton"
              defaults="Insert table"
            />
          </span>
        </Button>

        {isInTable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 px-2"
                aria-label={t('table.tableOptionsButton', {
                  defaultValue: 'Table options',
                })}
              >
                <TableIcon className="h-4 w-4" />
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onSelect={insertRowAbove}>
                <Trans
                  i18nKey="textEditor:table.insertRowAbove"
                  defaults="Insert row above"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={insertRowBelow}>
                <Trans
                  i18nKey="textEditor:table.insertRowBelow"
                  defaults="Insert row below"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={insertColumnLeft}>
                <Trans
                  i18nKey="textEditor:table.insertColumnLeft"
                  defaults="Insert column left"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={insertColumnRight}>
                <Trans
                  i18nKey="textEditor:table.insertColumnRight"
                  defaults="Insert column right"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={deleteRow}>
                <Trans
                  i18nKey="textEditor:table.deleteRow"
                  defaults="Delete row"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={deleteColumn}>
                <Trans
                  i18nKey="textEditor:table.deleteColumn"
                  defaults="Delete column"
                />
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={deleteTable}
              >
                <Trans
                  i18nKey="textEditor:table.deleteTable"
                  defaults="Delete table"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant={blockType === 'bullet' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={formatBulletList}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={blockType === 'number' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={formatNumberedList}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ImageToolbarButton
          FilePicker={FilePicker}
          getPublicUrl={getPublicUrl}
        />

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('left')}
          aria-label="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('center')}
          aria-label="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => alignText('right')}
          aria-label="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <EmojiPicker editor={editor} />

        <ColorPicker
          property={'color'}
          editor={editor}
          color={color}
          onOpenChange={() => {}}
        >
          <Paintbrush className="h-4 w-4" />
        </ColorPicker>

        <ColorPicker
          property={'background-color'}
          editor={editor}
          color={backgroundColor}
          onOpenChange={() => {}}
        >
          <PaintBucket className="h-4 w-4" />
        </ColorPicker>

        <LinkEditorPlugin variant="floating" />
      </div>

      <Dialog
        open={isTableDialogOpen}
        onOpenChange={handleTableDialogOpenChange}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <Trans
                i18nKey="textEditor:table.dialogTitle"
                defaults="Create table"
              />
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="textEditor:table.dialogDescription"
                defaults="Choose how many rows and columns you need. Tables support up to {{max}} rows and columns."
                values={{ max: MAX_TABLE_DIMENSION }}
              />
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="table-rows">
                  <Trans i18nKey="textEditor:table.rowsLabel" defaults="Rows" />
                </Label>
                <Input
                  id="table-rows"
                  type="number"
                  min={1}
                  max={MAX_TABLE_DIMENSION}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tableRowsInput}
                  onChange={(event) => {
                    setTableRowsInput(
                      sanitizeDimensionInput(event.target.value),
                    );
                  }}
                  placeholder={DEFAULT_TABLE_ROWS}
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="table-columns">
                  <Trans
                    i18nKey="textEditor:table.columnsLabel"
                    defaults="Columns"
                  />
                </Label>
                <Input
                  id="table-columns"
                  type="number"
                  min={1}
                  max={MAX_TABLE_DIMENSION}
                  step={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={tableColumnsInput}
                  onChange={(event) => {
                    setTableColumnsInput(
                      sanitizeDimensionInput(event.target.value),
                    );
                  }}
                  placeholder={DEFAULT_TABLE_COLUMNS}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="table-include-header"
                checked={tableIncludeHeader}
                onCheckedChange={(checked) => {
                  setTableIncludeHeader(checked === true);
                }}
              />

              <Label htmlFor="table-include-header" className="text-sm">
                <Trans
                  i18nKey="textEditor:table.includeHeader"
                  defaults="Include header row"
                />
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleTableDialogOpenChange(false)}
            >
              <Trans i18nKey="textEditor:table.cancel" defaults="Cancel" />
            </Button>

            <Button
              type="button"
              onClick={handleCreateTable}
              disabled={!isTableConfigValid}
            >
              <Trans
                i18nKey="textEditor:table.insertAction"
                defaults="Insert table"
              />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmojiPicker({ editor }: { editor: LexicalEditor }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Insert Emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-2">
        <div className="grid grid-cols-6 gap-1">
          {EMOJI_OPTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label={`Insert ${emoji} emoji`}
              onClick={() => {
                editor.dispatchCommand(
                  CONTROLLED_TEXT_INSERTION_COMMAND,
                  emoji,
                );
                setOpen(false);
                editor.focus();
              }}
            >
              <span className="text-lg leading-none">{emoji}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorPicker({
  property,
  color,
  editor,
  onOpenChange,
  className,
  children,
}: React.PropsWithChildren<{
  className?: string;
  property: string;
  color: string;
  editor: LexicalEditor;
  onOpenChange: (open: boolean) => void;
}>) {
  const subject$ = useMemo(() => new Subject<Record<string, string>>(), []);

  const [selection, setSelection] = useState<BaseSelection>();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        setSelection(selection);
      } else {
        setOpen(false);
        onOpenChange(false);
      }
    });
  }, [editor, onOpenChange, open]);

  useEffect(() => {
    const subscription = subject$.pipe(debounceTime(10)).subscribe((styles) => {
      editor.update(() => {
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [editor, subject$, selection]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(className)}
          onClick={() => {
            setOpen(() => {
              const next = !open;
              onOpenChange(next);
              return next;
            });
          }}
        >
          {children}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <ChromePicker
          color={color}
          onChange={(value) => {
            subject$.next({ [property]: value.hex });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
