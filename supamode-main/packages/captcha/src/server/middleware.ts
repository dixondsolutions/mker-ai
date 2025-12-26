import { Hono } from 'hono';

import { verifyCaptchaToken } from './verify-captcha';

/**
 * @name registerCaptchaMiddleware
 * @description Register the middleware for the captcha routes
 * @param router
 * @returns
 */
export function registerCaptchaMiddleware(router: Hono) {
  return router.use(async (c, next) => {
    try {
      // skip the middleware for OPTIONS and GET requests
      if (c.req.method === 'OPTIONS' || c.req.method === 'GET') {
        return next();
      }

      const captchaSecretToken = process.env['CAPTCHA_SECRET_TOKEN'];

      // only run if the captcha token is set
      if (!captchaSecretToken) {
        return next();
      }

      const captchaToken = c.req.header('X-Captcha-Token');

      // if the captcha token is not set, throw an error
      if (!captchaToken) {
        return new Response(
          JSON.stringify({
            error:
              'Captcha token is required. Please send the captcha token in the request header "X-Captcha-Token"',
          }),
          {
            status: 400,
          },
        );
      }

      // verify the captcha token
      await verifyCaptchaToken(captchaToken);

      await next();
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          error: 'Invalid captcha token',
        }),
        {
          status: 401,
        },
      );
    }
  });
}
