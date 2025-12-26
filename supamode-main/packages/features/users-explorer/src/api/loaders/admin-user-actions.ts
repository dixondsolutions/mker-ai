import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import {
  BanUserRoute,
  BatchBanUsersRoute,
  BatchDeleteUsersRoute,
  BatchResetPasswordsRoute,
  BatchUnbanUsersRoute,
  DeleteUserRoute,
  ResetPasswordRoute,
  UnbanUserRoute,
  UpdateAdminAccessRoute,
} from '../routes';

/**
 * @name banUser
 * @description Ban a user by ID
 * @param userId - The ID of the user to ban
 */
export async function banUser(userId: string) {
  const client = createHonoClient<BanUserRoute>();

  const response = await client['v1']['admin']['users'][':id']['ban'].$post({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name unbanUser
 * @description Unban a user by ID
 * @param userId - The ID of the user to unban
 */
export async function unbanUser(userId: string) {
  const client = createHonoClient<UnbanUserRoute>();

  const response = await client['v1']['admin']['users'][':id']['unban'].$post({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name resetUserPassword
 * @description Reset a user's password by ID
 * @param userId - The ID of the user
 */
export async function resetUserPassword(userId: string) {
  const client = createHonoClient<ResetPasswordRoute>();

  const response = await client['v1']['admin']['users'][':id'][
    'reset-password'
  ].$post({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name deleteUser
 * @description Delete a user by ID
 * @param userId - The ID of the user to delete
 */
export async function deleteUser(userId: string) {
  const client = createHonoClient<DeleteUserRoute>();

  const response = await client['v1']['admin']['users'][':id'].$delete({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name batchBanUsers
 * @description Ban multiple users by IDs
 * @param userIds - The IDs of the users to ban
 */
export async function batchBanUsers(userIds: string[]) {
  const client = createHonoClient<BatchBanUsersRoute>();

  const response = await client['v1']['admin']['users']['ban']['batch'].$post({
    json: { userIds },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name batchUnbanUsers
 * @description Unban multiple users by IDs
 * @param userIds - The IDs of the users to unban
 */
export async function batchUnbanUsers(userIds: string[]) {
  const client = createHonoClient<BatchUnbanUsersRoute>();

  const response = await client['v1']['admin']['users']['unban']['batch'].$post(
    {
      json: { userIds },
    },
  );

  return handleHonoClientResponse(response);
}

/**
 * @name batchResetPasswords
 * @description Reset passwords for multiple users by IDs
 * @param userIds - The IDs of the users
 */
export async function batchResetPasswords(userIds: string[]) {
  const client = createHonoClient<BatchResetPasswordsRoute>();

  const response = await client['v1']['admin']['users']['reset-password'][
    'batch'
  ].$post({
    json: { userIds },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name batchDeleteUsers
 * @description Delete multiple users by IDs
 * @param userIds - The IDs of the users to delete
 */
export async function batchDeleteUsers(userIds: string[]) {
  const client = createHonoClient<BatchDeleteUsersRoute>();

  const response = await client['v1']['admin']['users']['delete'][
    'batch'
  ].$post({
    json: { userIds },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name updateAdminAccess
 * @description Update admin access for a user
 * @param userId - The ID of the user
 * @param adminAccess - Whether the user should have admin access
 */
export async function updateAdminAccess(userId: string, adminAccess: boolean) {
  const client = createHonoClient<UpdateAdminAccessRoute>();

  const response = await client['v1']['admin']['users'][':id'][
    'admin-access'
  ].$put({
    param: { id: userId },
    json: { adminAccess },
  });

  return handleHonoClientResponse(response);
}
