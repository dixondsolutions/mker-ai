import type { Plugin } from 'vite';

/**
 * Vite plugin to inject the package version into the HTML data-version attribute
 */
export function viteVersionPlugin(): Plugin {
  return {
    name: 'version-injector',
    transformIndexHtml(html: string) {
      try {
        // Read the package.json file
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { version } = require('../../package.json');

        // Replace the data-version attribute with the actual version
        return html.replace(
          /data-version="[^"]*"/,
          `data-version="${version}"`,
        );
      } catch (error) {
        console.warn('Failed to inject version into HTML:', error);
        return html;
      }
    },
  };
}
