/* eslint-disable */
// @ts-nocheck
/**
 * This is a modified version of the sitemapper package meant to work with Turbopack.
 */
import isGzip from 'is-gzip';
import pLimit from 'p-limit';
import { parseStringPromise } from 'xml2js';
import zlib from 'zlib';

interface SitemapperOptions {
  url?: string;
  timeout?: number;
  lastmod?: number;
  requestHeaders?: Record<string, string>;
  debug?: boolean;
  concurrency?: number;
  retries?: number;
  rejectUnauthorized?: boolean;
  fields?: Record<string, boolean>;
}

interface SitesData {
  url: string;
  sites: string[];
  errors: SitemapError[];
}

interface SitemapError {
  type: string;
  message: string;
  url: string;
  retries: number;
}

type ParseResult =
  | {
      error: null;
      data: {
        urlset?: {
          url: {
            loc?: string[];
            lastmod?: string[];
            [key: string]: string[] | undefined;
          }[];
        };
        sitemapindex?: {
          sitemap: {
            loc?: string[];
            lastmod?: string[];
            [key: string]: string[] | undefined;
          }[];
        };
      };
    }
  | {
      error: string;
      data: Error;
    };

export class Sitemapper {
  private url: string;
  private timeout: number;
  private timeoutTable: Record<string, NodeJS.Timeout>;
  private lastmod: number;
  private requestHeaders: Record<string, string>;
  private debug: boolean;
  private concurrency: number;
  private retries: number;
  private rejectUnauthorized: boolean;
  private fields: Record<string, boolean> | false;

  constructor(options: SitemapperOptions = {}) {
    this.url = options.url ?? '';
    this.timeout = options.timeout ?? 15000;
    this.timeoutTable = {};
    this.lastmod = options.lastmod ?? 0;
    this.requestHeaders = options.requestHeaders ?? {};
    this.debug = options.debug ?? false;
    this.concurrency = options.concurrency ?? 10;
    this.retries = options.retries ?? 0;
    this.rejectUnauthorized = options.rejectUnauthorized !== false;
    this.fields = options.fields ?? false;
  }

  async fetch(url: string = this.url): Promise<SitesData> {
    let results: SitesData = {
      url: '',
      sites: [],
      errors: [],
    };

    if (this.debug && this.lastmod) {
      console.debug(`Using minimum lastmod value of ${this.lastmod}`);
    }

    try {
      results = await this.crawl(url);
    } catch (e) {
      if (this.debug) {
        console.error(e);
      }
    }

    return {
      url,
      sites: results.sites || [],
      errors: results.errors || [],
    };
  }

  private async parse(url: string = this.url): Promise<ParseResult> {
    const controller = new AbortController();
    const signal = controller.signal;

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: this.requestHeaders,
      signal,
    };

    if (!this.rejectUnauthorized) {
      console.warn('rejectUnauthorized option is not supported with fetch API');
    }

    try {
      this.initializeTimeout(url, controller);

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        clearTimeout(this.timeoutTable[url]);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      let responseBody: string;

      if (isGzip(uint8Array)) {
        responseBody = await this.decompressResponseBody(uint8Array);
      } else {
        responseBody = new TextDecoder().decode(uint8Array);
      }

      const data = await parseStringPromise(responseBody);

      return { error: null, data };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: `Request timed out after ${this.timeout} milliseconds for url: '${url}'`,
            data: error,
          };
        }

        return {
          error: `Error occurred: ${error.message}`,
          data: error,
        };
      }

      return {
        error: 'An unknown error occurred',
        data: new Error(error as string),
      };
    }
  }

  private initializeTimeout(url: string, controller: AbortController): void {
    this.timeoutTable[url] = setTimeout(() => controller.abort(), this.timeout);
  }

  private async crawl(url: string, retryIndex = 0): Promise<SitesData> {
    try {
      const { error, data } = await this.parse(url);
      clearTimeout(this.timeoutTable[url]);

      if (error) {
        if (retryIndex < this.retries) {
          if (this.debug) {
            console.log(
              `(Retry attempt: ${retryIndex + 1} / ${this.retries}) ${url} due to error on previous request`,
            );
          }

          return this.crawl(url, retryIndex + 1);
        }

        if (this.debug) {
          console.error(
            `Error occurred during "crawl('${url}')":\n\r Error: ${error}`,
          );
        }

        return {
          url,
          sites: [],
          errors: [
            {
              type: (data as Error).name || 'UnknownError',
              message: error,
              url,
              retries: retryIndex,
            },
          ],
        };
      } else if (data?.urlset?.url) {
        if (this.debug) {
          console.debug(`Urlset found during "crawl('${url}')"`);
        }

        const sites = data.urlset.url
          .filter((site) => {
            if (this.lastmod === 0) return true;
            if (site.lastmod === undefined) return false;

            const modified = new Date(site.lastmod[0]).getTime();

            return modified >= this.lastmod;
          })
          .map((site) => {
            return site.loc?.[0];
          })
          .filter(Boolean);

        return {
          url,
          sites,
          errors: [],
        };
      } else if (data && data.sitemapindex) {
        if (this.debug) {
          console.debug(`Additional sitemap found during "crawl('${url}')"`);
        }

        const sitemap = data.sitemapindex.sitemap.map(
          (map) => map.loc && map.loc[0],
        );

        const limit = pLimit(this.concurrency);

        const promiseArray = sitemap.map((site: string) =>
          limit(() => this.crawl(site)),
        );

        const results = await Promise.all(promiseArray);

        const sites = results
          .filter((result) => result.errors.length === 0)
          .reduce((prev, { sites }) => [...prev, ...sites], []);

        const errors = results
          .filter((result) => result.errors.length !== 0)
          .reduce((prev, { errors }) => [...prev, ...errors], []);

        return {
          url,
          sites,
          errors,
        };
      }

      if (retryIndex < this.retries) {
        if (this.debug) {
          console.log(
            `(Retry attempt: ${retryIndex + 1} / ${this.retries}) ${url} due to unknown state on previous request`,
          );
        }

        return this.crawl(url, retryIndex + 1);
      }

      if (this.debug) {
        console.error(`Unknown state during "crawl('${url})'":`, error, data);
      }

      return {
        url,
        sites: [],
        errors: [
          {
            url,
            type: 'UnknownStateError',
            message: 'An unknown error occurred.',
            retries: retryIndex,
          },
        ],
      };
    } catch (e) {
      if (this.debug) {
        console.error(e);
      }

      return {
        url,
        sites: [],
        errors: [
          {
            url,
            type: 'CrawlError',
            message:
              e instanceof Error ? e.message : 'An unknown error occurred',
            retries: retryIndex,
          },
        ],
      };
    }
  }

  private decompressResponseBody(body: Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(body, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(new TextDecoder().decode(result));
        }
      });
    });
  }
}
