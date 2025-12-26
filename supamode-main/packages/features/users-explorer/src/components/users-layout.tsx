import { Outlet } from 'react-router';

export function UsersLayout() {
  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex h-screen w-full flex-1 flex-col overflow-y-hidden">
        <Outlet />
      </div>
    </div>
  );
}
