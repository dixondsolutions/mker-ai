export async function getTitleFromMarkdown(markdown: string, url: string) {
    // Try to find the first H1 header
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1]) {
        return h1Match[1].trim();
    }

    // Fallback to URL
    return url;
}
