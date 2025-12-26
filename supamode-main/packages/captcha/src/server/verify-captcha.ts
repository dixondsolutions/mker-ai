import process from 'node:process';
import { z } from 'zod';

const verifyEndpoint =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @name verifyCaptchaToken
 * @description Verify the CAPTCHA token with the CAPTCHA service
 * @param token - The CAPTCHA token to verify
 */
export async function verifyCaptchaToken(token: string) {
  const formData = new FormData();

  const CAPTCHA_SECRET_TOKEN = z
    .string()
    .min(1, 'CAPTCHA_SECRET_TOKEN is required')
    .parse(process.env['CAPTCHA_SECRET_TOKEN']);

  formData.append('secret', CAPTCHA_SECRET_TOKEN);
  formData.append('response', token);

  const res = await fetch(verifyEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    console.error(`Captcha failed:`, res.statusText);

    throw new Error('Failed to verify CAPTCHA token');
  }

  const data = (await res.json()) as {
    success: boolean;
  };

  if (!data.success) {
    throw new Error('Invalid CAPTCHA token');
  }
}
