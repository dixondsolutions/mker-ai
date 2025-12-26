/**
 * Query keys for users explorer TanStack Query integration
 */
export const usersExplorerQueryKeys = {
  /**
   * All users-related queries
   */
  all: ['users-explorer'] as const,

  /**
   * Users list queries
   */
  users: () => [...usersExplorerQueryKeys.all, 'users'] as const,
  usersList: (filters?: { page?: number; search?: string }) =>
    [...usersExplorerQueryKeys.users(), 'list', filters] as const,

  /**
   * Individual user queries
   */
  user: (userId: string) =>
    [...usersExplorerQueryKeys.all, 'user', userId] as const,
  userDetails: (userId: string) =>
    [...usersExplorerQueryKeys.user(userId), 'details'] as const,

  /**
   * Admin-related queries
   */
  adminUsers: () => [...usersExplorerQueryKeys.all, 'admin-users'] as const,
  adminUsersList: (filters?: { page?: number; search?: string }) =>
    [...usersExplorerQueryKeys.adminUsers(), 'list', filters] as const,
};
