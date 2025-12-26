import { EditIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

type BatchAction = {
  label: string;
  icon?: React.ReactNode;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  onClick: () => void;
};

type BatchActionsToolbarProps = {
  className?: string;
  selectedCount: number;
  onClearSelection: () => void;
  actions?: BatchAction[];
  onBatchEdit?: () => void; // Keep for backward compatibility
  selectedItemsLabel?: string;
};

export function BatchActionsToolbar({
  className,
  selectedCount,
  onClearSelection,
  actions = [],
  onBatchEdit,
  selectedItemsLabel = 'settings:table.selectedItems',
}: BatchActionsToolbarProps) {
  // If no actions provided but onBatchEdit exists, use default batch edit action
  const defaultActions: BatchAction[] = onBatchEdit
    ? [
        {
          label: 'settings:table.batchEdit',
          icon: <EditIcon className="mr-2 h-4 w-4" />,
          onClick: onBatchEdit,
        },
      ]
    : [];

  const finalActions = actions.length > 0 ? actions : defaultActions;

  return (
    <div
      className={cn('flex items-center gap-x-2 p-2', className)}
      data-testid="batch-actions-toolbar"
    >
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground text-sm">
          <Trans
            i18nKey={selectedItemsLabel}
            values={{ count: selectedCount }}
          />
        </span>

        {finalActions.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center gap-2">
              {finalActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  className="h-8"
                >
                  {action.icon}
                  <Trans i18nKey={action.label} />
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8"
      >
        <Trans i18nKey="common:clear" />
      </Button>
    </div>
  );
}
