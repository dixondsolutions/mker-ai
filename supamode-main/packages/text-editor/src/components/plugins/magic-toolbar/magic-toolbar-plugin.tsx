import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { autoPlacement, computePosition } from '@floating-ui/dom';
import { $createCodeNode } from '@lexical/code';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $addUpdateTag,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INSERT_PARAGRAPH_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_SELECTION_FOCUS_TAG,
  createCommand,
} from 'lexical';
import { Code2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';

import {
  BulletListIcon,
  DecimalListIcon,
  DropdownMenuIcon,
  HeadingIcon,
  TextIcon,
} from './magic-toolbar-icons';

type FloatingMenuCoords = { x: number; y: number };

const HeadingCommand = createCommand('HEADING');
const ParagraphCommand = createCommand('PARAGRAPH');
const ListCommand = createCommand('LIST');
const CodeCommand = createCommand('CODE');

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

  useEffect(() => {
    const handleEditorFullscreenToggle = () => {
      setTimeout(() => {
        closeToolbar();
        editor.blur();
        (document.activeElement as HTMLElement)?.blur();
      }, 100);
    };

    document.addEventListener(
      'editor:fullscreen:toggle',
      handleEditorFullscreenToggle,
    );

    return () => {
      document.removeEventListener(
        'editor:fullscreen:toggle',
        handleEditorFullscreenToggle,
      );
    };
  }, [closeToolbar, editor]);

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
            y: pos.y - 50,
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
        CodeCommand,
        () => {
          editor.update(() => {
            $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
            let selection = $getSelection();

            if (!selection) {
              return;
            }

            if ($isRangeSelection(selection)) {
              const node = selection.getNodes()[0];
              const text = node ? node.getTextContent() : '';
              const tokens = text.split(' ');

              if (tokens.length > 1) {
                selection.deleteWord(true);
                selection.deleteWord(true);
              } else {
                selection.deleteWord(true);
              }
            }

            if (!$isRangeSelection(selection) || selection.isCollapsed()) {
              $setBlocksType(selection, () => $createCodeNode());
            } else {
              const textContent = selection.getTextContent();
              const codeNode = $createCodeNode();

              selection.insertNodes([codeNode]);
              selection = $getSelection();

              if ($isRangeSelection(selection)) {
                selection.insertRawText(textContent);
              }
            }
          });

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
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [visible, calculatePosition, editor, items, selectedItem, closeToolbar]);

  useEffect(() => {
    function focusFirstMenuItem() {
      const firstMenuItem = document.querySelector(
        '.magic-toolbar-menu-item',
      ) as HTMLElement;

      if (firstMenuItem) {
        firstMenuItem.focus();
      }
    }

    function navigateMenu(e: KeyboardEvent) {
      const currentMenuItem = document.activeElement as HTMLElement;

      if (e.key === 'ArrowDown') {
        const nextMenuItem = currentMenuItem.nextElementSibling as HTMLElement;

        if (nextMenuItem) {
          nextMenuItem.focus();
        }
      }

      if (e.key === 'ArrowUp') {
        const previousMenuItem =
          currentMenuItem.previousElementSibling as HTMLElement;

        if (previousMenuItem) {
          previousMenuItem.focus();
        }
      }

      if (e.key === 'Enter') {
        currentMenuItem.click();
      }
    }

    const listener = (e: KeyboardEvent) => {
      const activeElement = document.querySelector(
        '.magic-toolbar-menu-item:focus',
      ) as HTMLElement;

      if (e.key === 'ArrowDown' && !activeElement) {
        focusFirstMenuItem();
      }

      if (activeElement) {
        navigateMenu(e);
      }
    };

    if (visible) {
      document.addEventListener('keydown', listener);
    } else {
      document.removeEventListener('keydown', listener);
    }

    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [closeToolbar, visible]);

  return (
    <Popover
      onOpenChange={(open) => (open ? calculatePosition() : closeToolbar())}
      open={visible}
    >
      <PopoverTrigger asChild>
        <button className={'opacity-0'} ref={ref} />
      </PopoverTrigger>

      <PopoverContent
        className={
          'zoom-in animate-in fade-in flex max-h-96 flex-1 flex-col space-y-0 overflow-y-auto p-1 shadow-2xl'
        }
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
                'magic-toolbar-menu-item flex h-12 w-full items-center justify-start space-x-4 px-1'
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
      label: 'Heading 4',
      icon: <HeadingIcon>4</HeadingIcon>,
      id: 'heading-4',
      description: 'Insert a heading block with level 4',
      command: HeadingCommand,
      payload: {
        level: 'h4',
      },
    },
    {
      label: 'Heading 5',
      icon: <HeadingIcon>3</HeadingIcon>,
      id: 'heading-5',
      description: 'Insert a heading block with level 5',
      command: HeadingCommand,
      payload: {
        level: 'h5',
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
    {
      label: 'Code',
      icon: <Code2 />,
      id: 'code',
      description: 'Insert a code block',
      command: CodeCommand,
      payload: {},
    },
  ];
}
