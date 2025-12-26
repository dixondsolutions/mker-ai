import { useEffect, useState } from 'react';

import { createPortal } from 'react-dom';

import { Fullscreen, XIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

export function ExpandedOverlay({
  expanded,
  setExpanded,
  children,
  className,
  toolbarActions,
}: {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  children: React.ReactNode;
  className?: string;
  toolbarActions?: React.ReactNode;
}) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  // We don't want to allow fullscreen if the editor is inside a popover
  const allowFullscreen = !ref?.closest('[data-radix-popper-content-wrapper]');

  useEffect(() => {
    const html = document.documentElement;

    if (expanded) {
      html.classList.add('overflow-hidden');
    } else {
      html.classList.remove('overflow-hidden');
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatchEditorFullscreenToggle();

        setExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      html.classList.remove('overflow-hidden');

      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [expanded, setExpanded]);

  return (
    <>
      {allowFullscreen && (
        <div className="bg-background relative flex w-full justify-end">
          <div className="absolute -top-8 right-0 flex items-center gap-2">
            {toolbarActions}
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                setExpanded(!expanded);

                dispatchEditorFullscreenToggle();
              }}
            >
              <Fullscreen className="text-muted-foreground mr-2 h-4 w-4" />

              <Trans i18nKey={'dataExplorer:enlarge'} />
            </Button>
          </div>
        </div>
      )}

      <div className="flex w-full flex-1 flex-col" ref={setRef}>
        {expanded
          ? createPortal(
              <div className="animate-in fade-in zoom-in-95 fixed top-0 left-0 z-10 h-screen w-screen overflow-hidden bg-black/70 backdrop-blur-sm transition-all duration-100">
                <button
                  className="bg-foreground hover:bg-foreground/80 text-primary-foreground absolute top-2 right-2 z-100 cursor-pointer rounded-full p-0.5 dark:text-black"
                  onClick={() => {
                    setExpanded(false);

                    dispatchEditorFullscreenToggle();
                  }}
                >
                  <XIcon className="h-6 w-6" />
                </button>

                <div
                  className={cn(
                    'm-auto flex h-full w-full flex-col items-center justify-center',
                    className,
                  )}
                >
                  {children}
                </div>
              </div>,
              document.body,
            )
          : children}
      </div>
    </>
  );
}

function dispatchEditorFullscreenToggle() {
  document.dispatchEvent(
    new CustomEvent('editor:fullscreen:toggle', { detail: {} }),
  );
}
