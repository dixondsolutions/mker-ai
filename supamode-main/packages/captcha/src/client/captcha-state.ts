let captchaToken = '';
let resetCaptchaToken: () => void = () => {};

/**
 * @name getCaptchaState
 * @description Get the captcha state outside the provider. This is useful for when you need to use the captcha token in a non-react context, such as when we execute the Hono client in the router loader/action.
 * @returns The captcha state
 */
export function getCaptchaState() {
  return {
    token: captchaToken,
    resetCaptchaToken,
  };
}

/**
 * @name setCaptchaState
 * @description Set the captcha state
 * @param token - The captcha token
 * @param resetCaptchaToken - The function to reset the captcha token
 */
export function setCaptchaState(token: string, resetTokenCallback: () => void) {
  captchaToken = token;
  resetCaptchaToken = resetTokenCallback;
}
