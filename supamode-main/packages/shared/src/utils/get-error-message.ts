/**
 * @name getErrorMessage
 * @description Get the error message from an error
 * @param error - The error to get the message from
 * @returns The error message
 */
export function getErrorMessage(error: unknown) {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  // check if message is an RLS error and return a more user friendly message
  if (message.includes('new row violates row-level security policy')) {
    message =
      'The database business rule disallows this action. Please contact the administrator.';
  }

  return message;
}
