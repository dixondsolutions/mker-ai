import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { autoPlacement, computePosition } from '@floating-ui/dom';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import type { ElementNode, LexicalNode } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  INSERT_PARAGRAPH_COMMAND,
  SELECTION_CHANGE_COMMAND,
  createCommand,
} from 'lexical';

import { Button } from '@kit/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';

import {
  AutocompleteCommand,
  AutocompleteCommandLoading,
} from '../autocomplete-plugin';
import {
  BulletListIcon,
  DecimalListIcon,
  DropdownMenuIcon,
  HeadingIcon,
  TextIcon,
} from './magic-toolbar-icons';

type FloatingMenuCoords = { x: number; y: number };

const ContinueWithAICommand = createCommand('CONTINUE_WITH_AI');
const HeadingCommand = createCommand('HEADING');
const ParagraphCommand = createCommand('PARAGRAPH');
const ListCommand = createCommand('LIST');

export function MagicToolbarPlugin() {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [editor] = useLexicalComposerContext();
  const [context, setContext] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');

  const [coords, setCoords] = useState<FloatingMenuCoords>({
    x: 0,
    y: 0,
  });

  const closeToolbar = useCallback(() => {
    setCoords({
      x: 0,
      y: 0,
    });
  }, []);

  const items = useMemo(() => {
    return getMenuItems().filter((item) => {
      return item.label.toLowerCase().includes(context.toLowerCase());
    });
  }, [context]);

  const visible = Boolean(coords.x && coords.y) && items.length > 0;

  const calculatePosition = useCallback(() => {
    const domSelection = getSelection();

    const domRange =
      domSelection?.rangeCount !== 0 && domSelection?.getRangeAt(0);

    const calculate = () => {
      if (!domRange || !ref.current) {
        return closeToolbar();
      }

      computePosition(domRange, ref.current, {
        middleware: [
          autoPlacement({
            allowedPlacements: ['top', 'bottom'],
            padding: 50,
            autoAlignment: true,
            crossAxis: true,
          }),
        ],
      })
        .then((pos) => {
          setCoords({
            x: pos.x,
            y: pos.y,
          });
        })
        .catch(closeToolbar);
    };

    calculate();
    setTimeout(calculate, 0);
  }, [closeToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        HeadingCommand,
        (payload: { level: `h1` | `h2` | `h3` }) => {
          editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              const content = selection.getNodes().reduce((acc, item) => {
                return acc + item.getTextContent();
              }, '');

              selection.deleteWord(true);

              // If the content is not empty, insert a paragraph
              if (content.trim() !== '/') {
                selection.insertParagraph();
              }

              $setBlocksType(selection, () =>
                $createHeadingNode(payload.level),
              );
            }
          });

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        ParagraphCommand,
        () => {
          editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              selection.deleteWord(true);

              editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
            }
          });

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        ListCommand,
        ({ type }: { type: string }) => {
          editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              selection.deleteWord(true);

              const listType =
                type === 'decimal'
                  ? INSERT_ORDERED_LIST_COMMAND
                  : INSERT_UNORDERED_LIST_COMMAND;

              editor.dispatchCommand(listType, undefined);
            }
          });

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        ContinueWithAICommand,
        () => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            selection.deleteWord(true);

            let context = '';
            let node: LexicalNode | null | undefined = selection.getNodes()[0];

            while (node && context.length < 250) {
              context += node.getTextContent();

              const parent = node.getParent() as ElementNode;

              if (parent) {
                node = parent;
                continue;
              }

              const sibling = node.getPreviousSibling() as LexicalNode;

              if (sibling) {
                node = sibling;
                continue;
              }

              node = null;
            }

            if (context) {
              editor.dispatchCommand(AutocompleteCommand, {
                context,
              });

              closeToolbar();
            }
          }

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          const selection = $getSelection();

          if ($isRangeSelection(selection)) {
            const node = selection.getNodes()[0];
            const text = node ? node.getTextContent() : '';
            const tokens = text.split(' ');
            const lastWord = tokens[tokens.length - 1];

            if (lastWord?.includes('/')) {
              const word =
                lastWord.length > 1
                  ? lastWord.substring(lastWord.indexOf('/') + 1)
                  : '';

              setContext(word);

              if (items.length) {
                setSelectedItem(items[0]!.id);
                calculatePosition();
              }
            } else {
              closeToolbar();
            }
          }

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        AutocompleteCommandLoading,
        (payload: { state: boolean }, editor) => {
          const isLoading = payload.state;
          const root = editor.getRootElement();

          if (root) {
            if (isLoading) {
              root.classList.add('pointer-events-none');
            } else {
              root.classList.remove('pointer-events-none');
            }
          }

          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [visible, calculatePosition, editor, items, selectedItem, closeToolbar]);

  return (
    <Popover
      modal={true}
      onOpenChange={(open) => (open ? calculatePosition() : closeToolbar())}
      open={visible}
    >
      <PopoverTrigger asChild>
        <button className={'hidden'} ref={ref} />
      </PopoverTrigger>

      <PopoverContent
        className={'flex flex-1 flex-col space-y-0 p-1'}
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={{
          display: visible ? 'block' : 'none',
          position: 'fixed',
          top: coords.y,
          left: coords.x,
          width: '400px',
        }}
      >
        {items.map((item) => {
          return (
            <Button
              variant={'ghost'}
              tabIndex={0}
              className={
                'flex h-12 w-full items-center justify-start space-x-4 px-1'
              }
              key={item.id}
              onClick={() => editor.dispatchCommand(item.command, item.payload)}
            >
              <DropdownMenuIcon>{item.icon}</DropdownMenuIcon>

              <span className={'flex flex-col items-start'}>
                <span>{item.label}</span>

                <span className={'text-muted-foreground text-xs'}>
                  {item.description}
                </span>
              </span>
            </Button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function getMenuItems() {
  return [
    {
      label: 'Text',
      icon: <TextIcon />,
      description: 'Insert a new text block',
      id: 'text',
      command: ParagraphCommand,
      payload: {},
    },
    {
      label: 'Heading 1',
      icon: <HeadingIcon>1</HeadingIcon>,
      description: 'Insert a heading block with level 1',
      id: 'heading-1',
      command: HeadingCommand,
      payload: {
        level: 'h1',
      },
    },
    {
      label: 'Heading 2',
      icon: <HeadingIcon>2</HeadingIcon>,
      id: 'heading-2',
      description: 'Insert a heading block with level 2',
      command: HeadingCommand,
      payload: {
        level: 'h2',
      },
    },
    {
      label: 'Heading 3',
      icon: <HeadingIcon>3</HeadingIcon>,
      id: 'heading-3',
      description: 'Insert a heading block with level 3',
      command: HeadingCommand,
      payload: {
        level: 'h3',
      },
    },
    {
      label: 'Bullet List',
      icon: <BulletListIcon />,
      id: 'bullet-list',
      description: 'Insert a bullet list',
      command: ListCommand,
      payload: {
        type: 'bullet',
      },
    },
    {
      label: 'Number List',
      icon: <DecimalListIcon />,
      id: 'number-list',
      description: 'Insert a number list',
      command: ListCommand,
      payload: {
        type: 'decimal',
      },
    },
  ];
}
