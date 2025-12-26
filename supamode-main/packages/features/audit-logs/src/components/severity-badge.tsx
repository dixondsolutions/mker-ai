import { Badge } from '@kit/ui/badge';

import { auditLogsLoader } from '../loaders';

type AuditLog = Awaited<ReturnType<typeof auditLogsLoader>>['logs'][0];

export function SeverityBadge({
  severity,
}: {
  severity: AuditLog['severity'];
}) {
  return (
    <Badge variant={getSeverityBadgeVariant(severity)}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function getSeverityBadgeVariant(severity: AuditLog['severity']) {
  switch (severity) {
    case 'error':
      return 'destructive';

    case 'warning':
      return 'warning';

    case 'info':
      return 'info';

    default:
      return 'outline';
  }
}
