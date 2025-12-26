import FirecrawlApp from '@mendable/firecrawl-js';

export default class Crawler {
  private app: FirecrawlApp;

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not set');
    }

    this.app = new FirecrawlApp({ apiKey });
  }

  async crawl(url: string) {
    const response = await this.app.scrape(url, {
      formats: ['markdown'],
    });

    if (!response || !response.markdown) {
      throw new Error(`Failed to crawl URL: No markdown returned`);
    }

    return response.markdown;
  }

  async getSitemapLinks(url: string) {
    const response = await this.app.map(url);

    if (!response || !response.links) {
      throw new Error(`Failed to map URL: No links returned`);
    }

    return response.links;
  }

  filterLinks(
    sites: string[],
    {
      allow,
      disallow,
    }: {
      allow: string[];
      disallow: string[];
    },
  ) {
    const allowList = allow.filter(Boolean);
    const disallowList = disallow.filter(Boolean);

    return sites.filter((site) => {
      const isAllowed = allowList.length
        ? allowList.some((pattern) => site.includes(pattern))
        : true;

      const isDisallowed = disallowList.length
        ? disallowList.some((pattern) => site.includes(pattern))
        : false;

      return isAllowed && !isDisallowed;
    });
  }
}
