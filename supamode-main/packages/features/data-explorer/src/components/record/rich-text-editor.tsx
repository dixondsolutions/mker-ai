import { useCallback, useEffect, useState } from 'react';

import { Code, Type } from 'lucide-react';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { TextEditor } from '@kit/text-editor';
import { Button } from '@kit/ui/button';
import { ButtonGroup } from '@kit/ui/button-group';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { CodeEditor } from './code-editor';
import { ExpandedOverlay } from './expanded-overlay';
import { StorageFilePickerForTextEditor } from './storage-file-picker';

type EditorMode = 'rich' | 'code';

export function RichTextEditor(props: {
  value: string;
  property: string;
  onChange: (value: string) => void;
  placeholder: string | undefined;
  type: `html` | `markdown`;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const getPublicUrl = useGetPublicUrl();

  // Persist editor mode preference per field using localStorage
  const storageKey = `editor-mode-${props.property}`;

  const [mode, setMode] = useState<EditorMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);

      return (stored as EditorMode) || 'rich';
    }
    return 'rich';
  });

  // Persist mode changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [mode, storageKey]);

  const language = props.type === 'html' ? 'html' : 'markdown';

  return (
    <ExpandedOverlay
      expanded={expanded}
      setExpanded={setExpanded}
      toolbarActions={
        <ButtonGroup>
          <Button
            type="button"
            variant={mode === 'rich' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('rich')}
            className="gap-1 px-2"
          >
            <Type className="h-3 w-3" />
            <span className="text-xs">
              <Trans i18nKey="dataExplorer:editor.rich" defaults="Rich" />
            </span>
          </Button>

          <Button
            type="button"
            variant={mode === 'code' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('code')}
            className="gap-1 px-2"
          >
            <Code className="h-3 w-3" />
            <span className="text-xs">
              <Trans i18nKey="dataExplorer:editor.code" defaults="Code" />
            </span>
          </Button>
        </ButtonGroup>
      }
    >
      <div className="relative flex w-full flex-1 flex-col">
        {/* Conditional Editor Rendering */}
        {mode === 'rich' ? (
          <TextEditor
            type={props.type}
            content={props.value}
            onChange={props.onChange}
            FilePicker={StorageFilePickerForTextEditor}
            getPublicUrl={getPublicUrl}
            inputClassName={cn('min-h-96', {
              'max-h-96': !expanded,
            })}
            className={cn(
              'bg-background relative dark:shadow-xl',
              props.className,
              {
                'fixed top-0 right-0 bottom-0 left-0 z-20 mx-auto h-screen w-screen':
                  expanded,
              },
            )}
          />
        ) : (
          <div
            className={cn('bg-background relative dark:shadow-xl', {
              'fixed top-0 right-0 bottom-0 left-0 z-20 mx-auto h-screen w-screen p-4':
                expanded,
            })}
          >
            <CodeEditor
              value={props.value || ''}
              onChange={props.onChange}
              language={language}
              className={cn(props.className, {
                '[&>*]:h-96': !expanded,
                'h-full': expanded,
              })}
            />
          </div>
        )}
      </div>
    </ExpandedOverlay>
  );
}

function useGetPublicUrl() {
  const client = useSupabase();

  return useCallback(
    (filePath: string) => {
      // Check if it's already a valid URL
      try {
        const url = new URL(filePath);
        // If it's a valid URL, return it as-is
        return url.href;
      } catch {
        // Check if it looks like a Supabase storage path (bucket/path format without protocol)
        // Only treat as storage path if it doesn't contain a protocol and has proper bucket/path structure
        if (!filePath.includes('://') && filePath.includes('/')) {
          const [bucket, ...parts] = filePath.split('/');

          if (!bucket || !parts.length) {
            console.error('Invalid file path format:', filePath);
            return filePath;
          }

          const path = parts.join('/');

          return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        } else {
          // If it contains a protocol but still failed URL parsing, or doesn't look like a storage path, return as-is
          return filePath;
        }
      }
    },
    [client],
  );
}
