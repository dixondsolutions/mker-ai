import type { Hono } from 'hono';
import { ClientResponse, hc } from 'hono/client';
import { ResponseFormat } from 'hono/types';
import { z } from 'zod';

import { getCaptchaState } from '@kit/captcha/client';

/**
 * The URL of the API.
 */
const SITE_URL = z
  .url({
    message:
      'Invalid API URL. Please check the VITE_SITE_URL environment variable.',
  })
  .parse(import.meta.env['VITE_SITE_URL']);

const API_URL = z
  .url({
    message:
      'Invalid API URL. Please check the VITE_API_URL environment variable.',
  })
  .optional()
  .parse(import.meta.env['VITE_API_URL']);

type HonoClient<T extends Hono> = ReturnType<typeof hc<T>>;

/**
 * Creates a Hono client for the API.
 * This client is used to make requests to the API endpoints defined in the Hono app.
 * It includes credentials for cross-origin requests.
 *
 * @template T - The type of the Hono app.
 * @returns A Hono client configured to communicate with the API.
 */
export function createHonoClient<T extends Hono>(): HonoClient<T> {
  const url = getApiUrl().pathname;

  return hc<T>(url.toString(), {
    fetch: (input: string | URL | Request, init?: RequestInit) => {
      // skip the captcha headers for GET requests
      if (init?.method === 'GET') {
        return fetch(input, init);
      }

      // set the captcha headers for non-GET requests
      setCaptchaHeaders(init?.headers as Headers);

      return fetch(input, init);
    },
    init: {
      credentials: 'include',
    },
  });
}

function setCaptchaHeaders(headers: Headers) {
  const { token, resetCaptchaToken } = getCaptchaState();

  if (token) {
    headers.set('x-captcha-token', token);

    // reset the captcha token after it has been set
    resetCaptchaToken();
  }
}

function getApiUrl() {
  if (API_URL) {
    return new URL(API_URL);
  }

  if (SITE_URL) {
    return new URL('/api', SITE_URL);
  }

  throw new Error(
    'API URL is not defined. Please check the VITE_API_URL or VITE_SITE_URL environment variables.',
  );
}

/**
 * Extracts the success response type from a ClientResponse, excluding error responses
 */
type SuccessResponse<Resp> =
  Resp extends ClientResponse<unknown, number, string>
    ? Awaited<ReturnType<Resp['json']>> extends { error: string }
      ? never
      : Awaited<ReturnType<Resp['json']>>
    : never;

/**
 * Handles the response from the API.
 * If the response is not OK, it throws an error with the error message from the response.
 * Otherwise, it returns the JSON data from the response.
 *
 * @name handleHonoClientResponse
 * @param response - The response object from the fetch request.
 * @returns The JSON data from the response if successful.
 * @throws An error if the response is not OK.
 */
export async function handleHonoClientResponse<
  T,
  U extends number,
  F extends ResponseFormat,
  Resp extends ClientResponse<T, U, F>,
>(response: Resp): Promise<SuccessResponse<Resp>> {
  if (!response.ok) {
    try {
      const { error } = (await response.clone().json()) as { error: string };

      throw new Error(
        error || 'An error occurred. Please read the logs for more details.',
      );
    } catch {
      const text = await response.clone().text();

      try {
        const asJson = JSON.parse(text) as { error: string };

        throw new Error(asJson.error);
      } catch (error) {
        console.error(error);

        throw new Error(text);
      }
    }
  }

  return (await response.json()) as SuccessResponse<Resp>;
}
