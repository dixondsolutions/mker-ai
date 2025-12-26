import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import {
  BanUserRoute,
  BatchBanUsersRoute,
  BatchDeleteUsersRoute,
  BatchResetPasswordsRoute,
  BatchUnbanUsersRoute,
  CreateUserRoute,
  DeleteUserRoute,
  InviteUserRoute,
  RemoveMfaFactorRoute,
  ResetPasswordRoute,
  SendMagicLinkRoute,
  UnbanUserRoute,
  UpdateAdminAccessRoute,
} from '../routes';

/**
 * @name inviteUser
 * @description Invite a new user by email
 * @param email - The email of the user to invite
 */
export async function inviteUserRouterAction(email: string) {
  const client = createHonoClient<InviteUserRoute>();

  const response = await client['v1']['admin']['users']['invite'].$post({
    json: { email },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name createUser
 * @description Create a new user with email and password
 * @param params - User creation parameters
 */
export async function createUserRouterAction(params: {
  email: string;
  password: string;
  autoConfirm: boolean;
}) {
  const client = createHonoClient<CreateUserRoute>();

  const response = await client['v1']['admin']['users']['create'].$post({
    json: params,
  });

  return handleHonoClientResponse(response);
}

/**
 * @name deleteUser
 * @description Delete a user by ID
 * @param userId - The ID of the user to delete
 */
export async function deleteUserRouterAction(userId: string) {
  const client = createHonoClient<DeleteUserRoute>();

  const response = await client['v1']['admin']['users'][':id'].$delete({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name banUser
 * @description Ban a user by ID
 * @param userId - The ID of the user to ban
 */
export async function banUserRouterAction(userId: string) {
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
export async function unbanUserRouterAction(userId: string) {
  const client = createHonoClient<UnbanUserRoute>();

  const response = await client['v1']['admin']['users'][':id']['unban'].$post({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name resetPassword
 * @description Reset a user's password by ID
 * @param userId - The ID of the user whose password to reset
 */
export async function resetPasswordRouterAction(userId: string) {
  const client = createHonoClient<ResetPasswordRoute>();

  const response = await client['v1']['admin']['users'][':id'][
    'reset-password'
  ].$post({
    param: { id: userId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name batchBanUsers
 * @description Ban multiple users by IDs
 * @param userIds - The IDs of the users to ban
 */
export async function batchBanUsersRouterAction(userIds: string[]) {
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
export async function batchUnbanUsersRouterAction(userIds: string[]) {
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
export async function batchResetPasswordsRouterAction(userIds: string[]) {
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
export async function batchDeleteUsersRouterAction(userIds: string[]) {
  const client = createHonoClient<BatchDeleteUsersRoute>();

  const response = await client['v1']['admin']['users']['delete'][
    'batch'
  ].$post({
    json: { userIds },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name sendMagicLink
 * @description Send a magic link to a user
 * @param userId - The ID of the user
 * @param type - The type of magic link to send
 */
export async function sendMagicLinkRouterAction(
  userId: string,
  type: 'signup' | 'recovery' | 'invite',
) {
  const client = createHonoClient<SendMagicLinkRoute>();

  const response = await client['v1']['admin']['users'][':id'][
    'magic-link'
  ].$post({
    param: { id: userId },
    json: { type },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name removeMfaFactor
 * @description Remove an MFA factor from a user
 * @param userId - The ID of the user
 * @param factorId - The ID of the MFA factor to remove
 */
export async function removeMfaFactorRouterAction(
  userId: string,
  factorId: string,
) {
  const client = createHonoClient<RemoveMfaFactorRoute>();

  const response = await client['v1']['admin']['users'][':id']['mfa'][
    ':factorId'
  ].$delete({
    param: { id: userId, factorId },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name updateAdminAccess
 * @description Update admin access for a user
 * @param userId - The ID of the user
 * @param adminAccess - Whether the user should have admin access
 */
export async function updateAdminAccessRouterAction(
  userId: string,
  adminAccess: boolean,
) {
  const client = createHonoClient<UpdateAdminAccessRoute>();

  const response = await client['v1']['admin']['users'][':id'][
    'admin-access'
  ].$put({
    param: { id: userId },
    json: { adminAccess },
  });

  return handleHonoClientResponse(response);
}
