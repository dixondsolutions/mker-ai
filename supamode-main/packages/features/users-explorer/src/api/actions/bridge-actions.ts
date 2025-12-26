import { ActionFunctionArgs, redirect } from 'react-router';

import { getI18n } from 'react-i18next';
import z from 'zod';

import { createAction } from '@kit/shared/router-query-bridge';
import { extractErrorMessage } from '@kit/shared/utils';
import { toast } from '@kit/ui/sonner';

import { usersExplorerQueryKeys } from '../../lib/query-keys';
import {
  banUserRouterAction,
  batchBanUsersRouterAction,
  batchDeleteUsersRouterAction,
  batchResetPasswordsRouterAction,
  batchUnbanUsersRouterAction,
  createUserRouterAction,
  deleteUserRouterAction,
  inviteUserRouterAction,
  removeMfaFactorRouterAction,
  resetPasswordRouterAction,
  sendMagicLinkRouterAction,
  unbanUserRouterAction,
  updateAdminAccessRouterAction,
} from '../loaders/user-management-actions';

const UserIdParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Bridge-powered action for user invitation
 */
export const inviteUserBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const formData = await args.request.formData();
    const email = z.string().email().parse(formData.get('email'));

    return inviteUserRouterAction(email);
  },
  invalidateKeys: () => {
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    // We can't extract email from consumed formData, so we'll use a generic message
    toast.success(t('usersExplorer:actions.userInvited', { email: 'user' }));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.inviteFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for user creation
 */
export const createUserBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const formData = await args.request.formData();
    const data = JSON.parse(formData.get('data') as string);

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      autoConfirm: z.boolean().default(false),
    });

    const { email, password, autoConfirm } = schema.parse(data);

    const result = await createUserRouterAction({
      email,
      password,
      autoConfirm,
    });
    return { result, email };
  },
  invalidateKeys: () => {
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(
      t('usersExplorer:actions.userCreated', { email: data.email }),
    );
    return data.result;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.createFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for user deletion
 */
export const deleteUserBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const confirmText = formData.get('confirmText') as string;

    if (confirmText !== 'DELETE') {
      throw new Error('Confirmation text does not match');
    }

    return deleteUserRouterAction(userId);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: () => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.userDeleted'));
    return redirect('/users');
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.deleteFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for user ban
 */
export const banUserBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const confirmText = formData.get('confirmText') as string;

    if (confirmText !== 'BAN') {
      throw new Error('Confirmation text does not match');
    }

    return banUserRouterAction(userId);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.userBanned'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.banFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for user unban
 */
export const unbanUserBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return unbanUserRouterAction(userId);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.userUnbanned'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.unbanFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for password reset
 */
export const resetPasswordBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const confirmText = formData.get('confirmText') as string;

    if (confirmText !== 'RESET') {
      throw new Error('Confirmation text does not match');
    }

    return resetPasswordRouterAction(userId);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.passwordReset'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.resetFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for sending magic link
 */
export const sendMagicLinkBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const type = formData.get('type') as 'signup' | 'recovery' | 'invite';

    return sendMagicLinkRouterAction(userId, type);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.magicLinkSent'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('usersExplorer:actions.sendMagicLinkFailed'));
    throw error;
  },
});

/**
 * Bridge-powered action for removing MFA factor
 */
export const removeMfaFactorBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const factorId = formData.get('factorId') as string;

    if (!factorId) {
      throw new Error('Factor ID is required');
    }

    return removeMfaFactorRouterAction(userId, factorId);
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('usersExplorer:actions.mfaFactorRemoved'));
    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(
      errorMessage || t('usersExplorer:actions.removeMfaFactorFailed'),
    );
    throw error;
  },
});

/**
 * Bridge-powered action for updating admin access
 */
export const updateAdminAccessBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    const formData = await args.request.formData();
    const intent = formData.get('intent') as string;

    let adminAccess: boolean;
    if (intent === 'make-admin') {
      adminAccess = true;
    } else if (intent === 'remove-admin') {
      const confirmText = formData.get('confirmText') as string;
      if (confirmText !== 'REMOVE') {
        throw new Error('Confirmation text does not match');
      }
      adminAccess = false;
    } else {
      throw new Error('Invalid intent for admin access update');
    }

    const result = await updateAdminAccessRouterAction(userId, adminAccess);
    return { result, intent };
  },
  invalidateKeys: (args) => {
    const { id: userId } = UserIdParamsSchema.parse(args.params);
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
      // Invalidate this specific user
      usersExplorerQueryKeys.user(userId),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    if (data.intent === 'make-admin') {
      toast.success(t('usersExplorer:actions.adminAccessGranted'));
    } else {
      toast.success(t('usersExplorer:actions.adminAccessRevoked'));
    }
    return data.result;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);

    // We need to determine intent from formData to show appropriate error
    // Since we can't access the consumed formData, we'll use a generic error
    toast.error(
      errorMessage || t('usersExplorer:actions.adminAccessUpdateFailed'),
    );
    throw error;
  },
});

/**
 * Bridge-powered action for batch operations
 */
export const batchUsersBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { intent, payload } = await args.request.json();
    const { userIds } = payload;

    const result = await (() => {
      switch (intent) {
        case 'batch-ban':
          return batchBanUsersRouterAction(userIds);
        case 'batch-unban':
          return batchUnbanUsersRouterAction(userIds);
        case 'batch-reset-password':
          return batchResetPasswordsRouterAction(userIds);
        case 'batch-delete':
          return batchDeleteUsersRouterAction(userIds);
        default:
          throw new Error(`Unknown batch intent: ${intent}`);
      }
    })();

    return { result, intent, userIds };
  },
  invalidateKeys: () => {
    return [
      // Invalidate users list
      usersExplorerQueryKeys.users(),
      usersExplorerQueryKeys.adminUsers(),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    const { intent, userIds } = data;
    const count = userIds.length;

    switch (intent) {
      case 'batch-ban':
        toast.success(t('usersExplorer:actions.usersBanned', { count }));
        break;
      case 'batch-unban':
        toast.success(t('usersExplorer:actions.usersUnbanned', { count }));
        break;
      case 'batch-reset-password':
        toast.success(t('usersExplorer:actions.passwordsReset', { count }));
        break;
      case 'batch-delete':
        toast.success(t('usersExplorer:actions.usersDeleted', { count }));
        break;
    }

    return data.result;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(
      errorMessage || t('usersExplorer:actions.batchOperationFailed'),
    );
    throw error;
  },
});
