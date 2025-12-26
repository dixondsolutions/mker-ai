import { Outlet } from 'react-router';

export function AuditLogsLayout() {
  return (
    <div className="flex flex-1 flex-col">
      <Outlet />
    </div>
  );
}
