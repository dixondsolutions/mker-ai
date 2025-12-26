import { Outlet } from 'react-router';

export function DataExplorerLayout() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-1">
        <Outlet />
      </div>
    </div>
  );
}
